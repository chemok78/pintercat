var express = require("express");

require("dotenv").config({

  silent: true

});

var path = require("path");
//use node.js native path module to work with files and paths

var bodyParser = require("body-parser");
//load bodyParser module to parse incoming request bodies, under req.body

var mongodb = require("mongodb");

var ObjectID = mongodb.ObjectID;
//load ObjectID method so we can generate new objectID, using objectID = new ObjectID

var passport = require("passport");
//load passport.js

var TwitterStrategy = require("passport-twitter").Strategy;
//load passport.js Twitter-Strategy

var session = require("express-session");
//load express session

var PICS_COLLECTION = "pics";

var app = express();

/*Express Middleware*/

app.use(express.static(__dirname + "/public"));
//use express middleware for serving static files from public folder

app.use(bodyParser.json());
//parse all requests as JSON in the app instance

var db;
//use global variable to save database instance to use the connection throughout the app


mongodb.MongoClient.connect(process.env.DB_URL, function(err, database) {

  if (err) {

    console.log(err);

    process.exit(1);

  }

  db = database;

  console.log("successfully connected to database");

  var server = app.listen(process.env.PORT || 8080, function() {

    var port = server.address().port;

    console.log("App is now running on port", port);


  });

  /*RESTful API Web services*/

  function handleError(res, reason, message, code) {

    console.log("ERROR: " + reason);

    res.status(code || 500).json({

      "error": message

    });

  }


  app.use(session({
    //use express sessions in app    
    secret: 'keyboard cat'

  }));

  app.use(passport.initialize());
  //initialize passport and use it in the app

  app.use(passport.session());
  //intialize passport sessions and use it in the app


  passport.use(new TwitterStrategy({

    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: process.env.TWITTER_CALLBACK_DEVELOPMENT

  }, function(token, tokenSecret, profile, done) {

    process.nextTick(function() {

      //check if user exists in database
      //if not, make a new document for the user

      db.collection(PICS_COLLECTION).findOne({
        id: profile.id
      }, function(err, doc) {

        if (err) {

          console.log("Error findOne user in DB");

        } else {

          if (doc == null) {

            var userObject = {};
            //construct userObject to be saved in the database

            userObject.type = "user",
            userObject.id = profile.id;
            //we use the id from the profile object that is a string
            userObject.name = profile._json.name;
            userObject.screen_name = profile._json.screen_name;
            userObject.profile_image_url = profile._json.profile_image_url_https;
            userObject.pins = [];
            //one to many relationship, user has many pins and pin has 1 user
            //userObject.pins is an array of id's referencing the pin Object ID's

            db.collection(PICS_COLLECTION).insertOne(userObject, function(err, doc) {

              if (err) {

                console.log("Error insertOne userObject");

              } else {

                console.log("user inserted in database");

                console.log(doc);


              }



            }); // db.collection(PICS_COLLECTION).insertOne(userObject


          }

        } //if, else


      }); //db.collection(PICS_COLLECTION).findOne({id: profile._json.id}

      done(null, profile);

    });


  })); //passport.use

  passport.serializeUser(function(user, done) {
    //save user object in session
    //result of serializeUser is attached to the session as req.session.passport.user = {}
    console.log("user serialized");

    done(null, user);
    //save the user object
    //can be done(null, user.id) if you want to save only the id

  });

  passport.deserializeUser(function(id, done) {
    //retrieve user with the key given as obj parameter
    //the fetched object will be attached to req.user

    done(null, id);

  });

  // Redirect the user to Twitter for authentication.  When complete, Twitter
  // will redirect the user back to the application at
  // /auth/twitter/callback

  app.get('/auth/twitter', passport.authenticate("twitter"));

  // Twitter will redirect the user to this URL after approval.  Finish the
  // authentication process by attempting to obtain an access token.  If
  // access was granted, the user will be logged in.  Otherwise,
  // authentication has failed.

  app.get('/auth/twitter/callback', passport.authenticate('twitter', {

    successRedirect: '/',
    failureRedirect: '/login'


  }));

  var auth = function(req, res, next) {
    //Middleware function to check if user is authenticated, to be used in every secured route

    if (!req.authenticated) {
      //if user is not authenticated send a 401 response status code
      //every 401 will be intercepted by $httpProvider.interceptors in Angular JS front-end
      console.log("You need to login!");

      res.sendStatus(401);

    } else {
      //if user is authenticated move on to next middleware function in stack


      next();
      //user is logged in and move on to next middleware function in stack

    }


  }; //var auth

  //route to call from front-end to check if a user is logged in and who?

  app.get('/loggedin', function(req, res) {
    //Route to test if user is logged in, called from Angular front-end

    if (req.isAuthenticated()) {

      console.log("we found a user logged in!");

      res.send(req.user);

    } else {

      res.send('0');

    }

  });

  app.get('/logout', function(req, res) {
    //route to log out from Twittr login

    req.logout();
    //use Passport JS build in method to log user iut and deserialize user

    res.redirect('/');
    //redirect to homepage after log out


  });

  /*RESTful API's*/

  app.get('/retrieveuser/:user', function(req, res) {
    //called from Users.retrieveuser service in front-end 
    //sends user id as parameter to look up in the database

    db.collection(PICS_COLLECTION).findOne({
      id: req.params.user
    }, function(err, doc) {

      if (err) {

        console.log("Error findOne user from DB");

      } else {

        res.status(200).json(doc);

      }



    }); //db.collection(PICS_COLLECTION).findOne({}

  }); //app.get('/retrieveuser/:user'


  app.post("/addpicture", auth, function(req, res) {
    //called from Pins.addPicture method that sends the pics object from form
    //we have req.user.id (string) and req.body

    var pinObject = {

      "type": "pin",
      "url": req.body.url,
      "description": req.body.description,
      "userID": req.user.id,
      "profile_image_url": req.user._json.profile_image_url_https,
      "likes": []

    };

    //save pin in database
    //add ObjectID to user.pins

    db.collection(PICS_COLLECTION).insertOne(pinObject, function(err, doc) {

      if (err) {

        handleError(res, err.message, "Failed to insert Pin");

      } else {
        //database insert returns inserted document as doc.ops[0]
        //doc.ops[0] has the MongoDB ObjectID as ._id, which is an object (not a string)

        var o_id = doc.ops[0]._id;
        //save object ID

        var o_id_string = o_id.toString();
        //convert object ID to string, to be saved in the User document

        //convert the string back to an ObjectID with ObjectID(o_id_string)


        db.collection(PICS_COLLECTION).findAndModify({
            //find logged in user in database and add the object ID reference to the pins array

            id: req.user.id
          },

          [
            ['_id', 'asc']
          ],

          {
            $push: {
              pins: o_id_string
            }
          }


          , {

            new: true

          },
          function(err, doc) {

            if (err) {

              console.log(err);

            } else {

              console.log("successfully added o_id_string to pins array user");


            }


          });


      } //if, else


    }); //db.collection(PICS_COLLECTION).insertOne(pinObject


    res.status(200).json(pinObject);

  }); //app.post("/addpicture"


  app.get("/retrieveallpins", function(req, res) {

    db.collection(PICS_COLLECTION).find({
      type: "pin"
    }).toArray(function(err, doc) {

      if (err) {

        console.log("Error retrieving all pins");

      } else {

        res.status(200).json(doc);
      }


    }); //db.collection(PICS_COLLECTION).find


  }); // app.get("/retrieveallpins"


  app.get("/retrieveuserpins", function(req, res) {
    //we have req.user.id (string) and req.body    

    db.collection(PICS_COLLECTION).find({
      userID: req.user.id,
      type: "pin"
    }).toArray(function(err, doc) {

      if (err) {

        console.log("Error retrieving all pins belonging to user " + req.user.id);

      } else {


        res.status(200).json(doc);

      }


    }); //db.collection(PICS_COLLECTION)


  }); //app.get("/retrieveuserpins"

  app.post("/deleteuserpic", function(req, res) {

    if (req.user.id === req.body.userID) {
      //update only when user ID in pin is the same as user ID logged in    

      //delete the whole pin document from the database

      db.collection(PICS_COLLECTION).deleteOne({
        _id: new ObjectID(req.body._id)
      }, function(err, result) {
        //req.body._id is a string (we converted from objectID before saving to database)
        //_id in database is an object ID
        //so convert req.body._id to objectID first before looking up in database

        if (err) {

          console.log("Error deleting pin from database");

        } else {

          //console.log(result);

          console.log("Success deleting pin from database");

        }

      }); //db.collection(PICS_COLLECTION).deleteOne


      db.collection(PICS_COLLECTION).update(
        //delete the Object ID from the user in database

        {
          id: req.body.userID,
          //find the user in database with userID reference in pin
        },

        {
          $pull:
          //delete in the pins array of user, the element that matches the req.body._id

          {
            pins: req.body._id
          }

        },
        function(err, doc) {


          if (err) {

            console.log(err);

          } else {

            console.log("successfully deleted pin reference from user");

            res.status(200).json(doc);

          }


        }

      ); //db.collection(PICS_COLLECTION).update

    } else {
      //User is not the one belonging to the Pin    

      res.sendStatus(401);
      //send unauthorized http status 

    }



  }); //app.post("/deleteuserpic"

  app.post("/editlikes", auth, function(req, res) {
    //route to add or remove likes    

    db.collection(PICS_COLLECTION).findOne({
      _id: new ObjectID(req.body._id)
    }, function(err, doc) {
      //find the pic object in the database with the _id property of the pic from front-end

      if (err) {

        console.log("Error finding the pin to edit likes");

      } else {


        if (doc.likes.indexOf(req.body.userID) === -1) {
          //if the likes array does not have the user ID from the pic object       
          //add the user ID from req.body._id to the array  
          //use Mongo $push

          db.collection(PICS_COLLECTION).update(

            {

              _id: new ObjectID(req.body._id)

            },

            {

              $push:

              {
                likes: req.user.id

              }

            },
            function(err, doc) {

              if (err) {

                console.log("Could not add user ID to likes pin of selected pin");

              } else {

                res.status(200).json(doc);


              }


            }

          ); //db.collection(PICS_COLLECTION).update




        } else {
          //if the likes array has the user ID from the pic object
          //remove the user ID from req.body._id to the array       
          //use Mongo $pull   

          console.log("could find the user ID in likes array");

          db.collection(PICS_COLLECTION).update(

            {

              _id: new ObjectID(req.body._id)

            },

            {

              $pull:

              {
                likes: req.user.id

              }

            },
            function(err, doc) {

              if (err) {

                console.log("Could not remove user ID to likes pin of selected pin");

              } else {

                res.status(200).json(doc);


              }


            }

          ); //db.collection(PICS_COLLECTION).update



        }


      }



    }); //db.collection(PICS_COLLECTION).findOne({_id: req.body_id} 

  });


}); //mongodb.MongoClient.connect

