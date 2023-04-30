"use strict";
const log = console.log;

// Express

const express = require("express");
const app = express();
var cors = require("cors");
const bodyParser = require("body-parser");
app.use(bodyParser.json());
const crypto = require("crypto");

app.use(cors({ origin: "*" }));

// Mongo and Mongoose
const { ObjectID } = require("mongodb");
const { mongoose } = require("./db/mongoose");
const { User, Tournament } = require("./models/schemas");

var discover_people_current_user = null;

// APIs

app.use(function (req, res, next) {
  //Enabling CORS
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization"
  );
  next();
});

app.get("/", (req, res) => {
  res.redirect(200, "../login/index.html");
});

app.post("/add-person", (req, res) => {
  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  const tournament = new Tournament({
    tournament_name: "A",
    date: "2022/03/14",
    description: "T A",
    organiser: "OA",
    participants: [],
  });

  //  const user = new User({
  //  fullname: "Person A",
  //  md5_password_hash: "Password Hashed",
  //  date_of_birth: "2001-03-15",
  //  location: "Toronto",
  //  university: "UofT",
  //  description: "A Description",
  //  social_handles: {
  //    instagram: "insta",
  //    twitter: "twitter"
  //  },
  //  attributes: ["Eating", "Dancing", "Singing"],
  //  followed: [],
  //  passed: [],
  //  tournament_joined: [],
  //  tournament_created: []
  // })

  // normal promise version:
  tournament
    .save()
    .then((result) => {
      res.send(result);
    })
    .catch((error) => {
      log(error); // log server error to the console, not to the client.
      if (isMongoError(error)) {
        // check for if mongo server suddenly dissconnected before this request.
        res.status(500).send("Internal server error");
      } else {
        res.status(400).send("Bad Request"); // 400 for bad request gets sent to client.
      }
    });
});

// functioning for obtained the information about a particular user [M]
app.get("/person-info/:id", (req, res) => {
  const id = req.params.id;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  User.findById(id)
    .then((user) => {
      if (!user) {
        res.status(404).send("Resource not found");
      } else {
        res.send(user);
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send("Internal Server Error"); // server error
    });
});

// get the list of followed people [M]
app.get("/followed-people/:id", (req, res) => {
  const id = req.params.id;
  console.log("id from the request");
  console.log(id);

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  User.findById(id)
    .then((user) => {
      if (!user) {
        res.status(404).send("Resource not found");
      } else {
        const strPeopleList = user.followed;

        User.find()
          .where("_id")
          .in(strPeopleList)
          .exec((err, records) => {
            res.send(records);
          });
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send("Internal Server Error"); // server error
    });
});

app.get("/discover-people/:id", (req, res) => {
  const id = req.params.id;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  // User.findById(id)
  //   .then((user) => {
  //     if (!user) {
  //       res.status(404).send("Resource not found");
  //       return;
  //     } else {
  //       res.send(user);
  //       return;
  //     }
  //   })
  //   .catch((error) => {
  //     log(error);
  //     res.status(500).send("Internal Server Error"); // server error
  //     return;
  //   });

  User.findById(id)
    .then((user) => {
      if (!user) {
        res.status(404).send("Resource not found");
      } else {
        discover_people_current_user = user;

        User.find({}, function (err, users) {
          var max_index = -1;
          var max_similarity = -1;
          var self_attributes = [
            ...discover_people_current_user.attributes,
          ].join(" ");

          for (var i = 0; i < users.length; i++) {
            // const similarity = require('compute-cosine-similarity');
            var similarity = require("string-cosine-similarity");
            if (
              !discover_people_current_user.followed.includes(users[i].id) &&
              users[i].id != discover_people_current_user.id &&
              !discover_people_current_user.passed.includes(users[i].id)
            ) {
              var other_attributes = [...users[i].attributes].join(" ");

              var sim = similarity(other_attributes, self_attributes);

              if (!sim) {
                sim = 0;
              }

              if (sim > max_similarity) {
                max_similarity = sim;
                max_index = i;
              }
            }
          }

          if (max_index == -1) {
            res.status(204).send("No More People to discover");
          } else {
            res.send(users[max_index]);
          }
        });
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send("Internal Server Error"); // server error
    });
});

app.post("/follow-person/:self/:other", (req, res) => {
  const self_id = req.params.self;
  const other_id = req.params.other;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(self_id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  User.findById(self_id)
    .then((user) => {
      if (!user) {
        res.status(404).send("Resource not found");
      } else {
        if (!user.followed.includes(other_id)) {
          user.followed.push(other_id);
        }

        // normal promise version:
        user
          .save()
          .then((result) => {
            res.send(result);
          })
          .catch((error) => {
            log(error); // log server error to the console, not to the client.
            if (isMongoError(error)) {
              // check for if mongo server suddenly dissconnected before this request.
              res.status(500).send("Internal server error");
            } else {
              res.status(400).send("Bad Request"); // 400 for bad request gets sent to client.
            }
          });
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send("Internal Server Error"); // server error
    });
});

app.post("/pass-person/:self/:other", (req, res) => {
  const self_id = req.params.self;
  const other_id = req.params.other;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(self_id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  User.findById(self_id)
    .then((user) => {
      if (!user) {
        res.status(404).send("Resource not found");
      } else {
        if (!user.passed.includes(other_id)) {
          user.passed.push(other_id);
        }

        // normal promise version:
        user
          .save()
          .then((result) => {
            res.send(result);
          })
          .catch((error) => {
            log(error); // log server error to the console, not to the client.
            if (isMongoError(error)) {
              // check for if mongo server suddenly dissconnected before this request.
              res.status(500).send("Internal server error");
            } else {
              res.status(400).send("Bad Request"); // 400 for bad request gets sent to client.
            }
          });
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send("Internal Server Error"); // server error
    });
});

app.get("/created-tournaments/:self", (req, res) => {
  const id = req.params.self;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  User.findById(id)
    .then((user) => {
      if (!user) {
        res.status(404).send("Resource not found");
      } else {
        Tournament.find()
          .where("_id")
          .in(user.tournament_created)
          .exec((err, records) => {
            res.send(records);
          });
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send("Internal Server Error"); // server error
    });
});
// list of tournaments joined by a person [M]
app.get("/joined-tournaments/:self", (req, res) => {
  const id = req.params.self;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  User.findById(id)
    .then((user) => {
      if (!user) {
        res.status(404).send("Resource not found");
      } else {
        Tournament.find()
          .where("_id")
          .in(user.tournament_joined)
          .exec((err, records) => {
            res.send(records);
          });
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send("Internal Server Error"); // server error
    });
});

// TOURNAMENT ROUTES

// POST route to create a tournament

app.post("/create-tournament/:id", async (req, res) => {
  const id = req.params.id;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404).send("User not found");
  }

  // Create a new tournament
  const newTournament = new Tournament({
    tournament_name: req.body.name,
    date: req.body.date,
    description: req.body.description,
    organiser: req.body.organiser,
    location: req.body.location,
    participants: [id],
  });

  log("tournament created!");

  newTournament
    .save()
    .then((result) => {
      user.tournament_created.push(newTournament._id);

      user
        .save()
        .then((result) => {
          res.send(result);
        })
        .catch((error) => {
          log(error); // log server error to the console, not to the client.
          if (isMongoError(error)) {
            // check for if mongo server suddenly dissconnected before this request.
            res.status(500).send("Internal server error");
          } else {
            res.status(400).send("Bad Request"); // 400 for bad request gets sent to client.
          }
        });
      // res.send(result);
    })
    .catch((error) => {
      log(error); // log server error to the console, not to the client.
      if (isMongoError(error)) {
        // check for if mongo server suddenly dissconnected before this request.
        res.status(500).send("Internal server error");
      } else {
        res.status(400).send("Bad Request"); // 400 for bad request gets sent to client.
      }
    });
});

// GET request to get the presaved tournament details

app.get("/edit-tournament/:id/:tid", async (req, res) => {
  const id = req.params.id;
  const tournamentId = req.params.tid;

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(tournamentId)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // const user = await User.findById(id);
  // if (!user) {
  //   res.status(404).send("User not found");
  // }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    res.status(404).send("Tournament not found");
  } else {
    res.send(tournament);
  }
});

// POST route to edit a tournament

app.post("/edit-tournament/:id/:tid", async (req, res) => {
  const id = req.params.id;
  const tournamentId = req.params.tid;

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(tournamentId)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // const user = await User.findById(id);
  // if (!user) {
  //   res.status(404).send("User not found");
  // }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    res.status(404).send("Tournament not found");
  } else {
    if (req.body.name) {
      tournament.tournament_name = req.body.name;
    }

    if (req.body.date) {
      tournament.date = req.body.date;
    }

    if (req.body.description) {
      tournament.description = req.body.description;
    }

    if (req.body.organiser) {
      tournament.organiser = req.body.organiser;
    }

    if (req.body.location) {
      tournament.location = req.body.location;
    }

    tournament
      .save()
      .then((result) => {
        res.status(200).send(tournament);
      })
      .catch((error) => {
        log(error); // log server error to the console, not to the client.
        if (isMongoError(error)) {
          // check for if mongo server suddenly dissconnected before this request.
          res.status(500).send("Internal server error");
        } else {
          res.status(400).send("Bad Request"); // 400 for bad request gets sent to client.
        }
      });
  }
});

// GET route for getting all the tournaments that are visible to a person with given user ID
app.get("/discover-tournaments/:id", async (req, res) => {
  const id = req.params.id;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  const tournaments = await Tournament.find();

  var visibleTournaments = [];

  User.findById(id)
    .then((user) => {
      if (!user) {
        res.status(404).send("User not found!");
      } else {
        const discover_people_current_user = user;

        const this_user_joined_tournaments = user.tournament_joined;

        for (var i = 0; i < tournaments.length; i++) {
          if (!this_user_joined_tournaments.includes(tournaments[i]._id)) {
            visibleTournaments.push(tournaments[i]);
          }
        }

        res.send(visibleTournaments);
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send("Internal Server Error"); // server error
    });
});

// POST request for joining a tournanment
app.post("/discover-tournament/:id/:tid", async (req, res) => {
  const id = req.params.id;
  const tournamentId = req.params.tid;

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(tournamentId)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404).send("User not found");
  } else {
    user.tournament_joined.push(tournamentId);

    user
      .save()
      .then((result) => {
        res.send(result);
      })
      .catch((error) => {
        log(error); // log server error to the console, not to the client.
        if (isMongoError(error)) {
          // check for if mongo server suddenly dissconnected before this request.
          res.status(500).send("Internal server error");
        } else {
          res.status(400).send("Bad Request"); // 400 for bad request gets sent to client.
        }
      });
  }
});

app.post("/set-preference/:id", async (req, res) => {
  const id = req.params.id;

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    return; // so that we don't run the rest of the handler.
  }

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404).send("User not found");
  } else {
    if (req.body.firstName) {
      user.firstName = req.body.firstName;
      user.fullname = req.body.firstName;
    }

    if (req.body.lastName) {
      user.lastName = req.body.lastName;
      user.fullname = user.fullname + " " + req.body.lastName;
    }

    if (req.body.gender) {
      user.gender = req.body.gender;
    }

    if (req.body.date_of_birth) {
      user.date_of_birth = req.body.date_of_birth;
    }

    if (req.body.location) {
      user.location = req.body.location;
    }

    if (req.body.province) {
      user.province = req.body.province;
    }

    if (req.body.postalCode) {
      user.postalCode = req.body.postalCode;
    }

    if (req.body.description) {
      user.description = req.body.description;
    }

    if (req.body.contact) {
      user.contact = req.body.contact;
    }

    if (req.body.social_handles) {
      user.social_handles = req.body.social_handles;
    }

    if (req.body.attributes) {
      user.attributes = req.body.attributes;
    }

    if (req.body.university) {
      user.university = req.body.university;
    }

    user
      .save()
      .then((result) => {
        res.send(result);
      })
      .catch((error) => {
        log(error); // log server error to the console, not to the client.
        if (isMongoError(error)) {
          // check for if mongo server suddenly dissconnected before this request.
          res.status(500).send("Internal server error");
        } else {
          res.status(400).send("Bad Request"); // 400 for bad request gets sent to client.
        }
      });
  }
});

/////////////////////////////// For Preference Screens ///////////////////////////////

app.get("/set-preference/:id", async (req, res) => {
  const id = req.params.id;

  // Good practise: Validate id immediately.
  if (!ObjectID.isValid(id)) {
    res.status(404).send(); // if invalid id, definitely can't find resource, 404.
    log("prime 404");
    return; // so that we don't run the rest of the handler.
  }

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404).send("User not found");
    log("in the if statement before the if statement");
  } else {
    res.status(200).send(user);
    log("in the res.send correct one");
  }
});

// ===================== Integration Step =============================
let local_username = "";
let local_password = "";

// A route to login and create a session
app.post("/login", (req, res) => {
  local_username = req.body.username;
  local_password = req.body.password;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send({ error: "Internal Server Error" });
    return;
  }

  User.findOne({ username: local_username })
    .then((user) => {
      if (!user) {
        res.status(203).send({ error: "Resource not found" });
      } else {
        // Debug
        var a = 1;
        if (
          user.md5_password_hash ==
          crypto.createHash("md5").update(local_password).digest("hex")
        ) {
          res.send({ user_id: user.id });
          return;
        } else {
          res.status(204).send({ error: "Incorrect Password" });
        }
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send({ error: "Internal Server Error" }); // server error
    });
});

app.post("/register", (req, res) => {
  local_username = req.body.username;
  local_password = req.body.password;

  // check mongoose connection established.
  if (mongoose.connection.readyState != 1) {
    log("Issue with mongoose connection");
    res.status(500).send("Internal server error");
    return;
  }

  User.findOne({ username: local_username })
    .then((user) => {
      if (!user) {
        // Success State
        const user = new User({
          username: local_username,
          md5_password_hash: crypto
            .createHash("md5")
            .update(local_password)
            .digest("hex"),
        });

        user
          .save()
          .then((result) => {
            res.send(result);
            return;
          })
          .catch((error) => {
            log(error); // log server error to the console, not to the client.
            if (isMongoError(error)) {
              // check for if mongo server suddenly dissconnected before this request.
              res.status(500).send({ error: "Internal server error" });
            } else {
              res.status(400).send({ error: "Bad Request" }); // 400 for bad request gets sent to client.
            }
          });
      } else {
        res.status(200).send({ error: "Username already exists" });
      }
    })
    .catch((error) => {
      log(error);
      res.status(500).send({ error: "Internal Server Error" }); // server error
    });
});

////////// DO NOT CHANGE THE CODE OR PORT NUMBER BELOW
app.listen(process.env.PORT || 5002, () => {
  log("Listening on port!");
});
