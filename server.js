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

app.use(session({
//use express sessions in app    
    secret: 'keyboard cat'
    
}));

app.use(passport.initialize());
//initialize passport and use it in the app

app.use(passport.session());
//intialize passport sessions and use it in the app

var db;
//use global variable to save database instance to use the connection throughout the app

passport.use(new TwitterStrategy({
    
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: process.env.TWITTER_CALLBACK_DEVELOPMENT
    
}, function(token, tokenSecret, profile,done)  {
    
    process.nextTick(function(){
        
       console.log("logging profile!");    
       console.log(profile);    
        
       done(null, profile);
        
    });
    
    
}));//passport.use

passport.serializeUser(function(user,done){
   //save user object in session
   //result of serializeUser is attached to the session as req.session.passport.user = {}
   console.log("user serialized");
   
   done(null,user); 
   //save the user object
   //can be done(null, user.id) if you want to save only the id
    
});

passport.deserializeUser(function(id,done){
    //retrieve user with the key given as obj parameter
    //the fetched object will be attached to req.user
    
   done(null,id);
    
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

var auth = function(req,res,next){
//Middleware function to check if user is authenticated, to be used in every secured route

    if(!req.authenticated){
    //if user is not authenticated send a 401 response status code
    //every 401 will be intercepted by $httpProvider.interceptors in Angular JS front-end
        alert("You need to login!");
        
        res.sendStatus(401);
        
    } else {
    //if user is authenticated move on to next middleware function in stack
        
        console.log("You logged in!");
        
        next();
        //user is logged in and move on to next middleware function in stack
        
    }


};//var auth

//route to call from front-end to check if a user is logged in and who?

app.get('/loggedin', function(req,res){
    //Route to test if user is logged in, called from Angular front-end
    
   if(req.isAuthenticated()){
       
       console.log("we found a user logged in!");
       
       res.send(req.user);
       
   } else {
       
       res.send('0');
       
   } 
    
});

app.get('/logout', function(req,res){
    //route to log out from Twittr login
   
   req.logout();
   //use Passport JS build in method to log user iut and deserialize user
   
   res.redirect('/');
   //redirect to homepage after log out
    
    
});

mongodb.MongoClient.connect(process.env.DB_URL, function(err,database){
    
    if(err){
        
        console.log(err);
        
        process.exit(1);
        
    }
    
    db = database;
    
    console.log("successfully connected to database");
    
    var server = app.listen(process.env.PORT || 8080, function(){
        
       var port = server.address().port;
       
       console.log("App is now running on port", port);
        
        
    });
    
    /*RESTful API Web services*/
    
    function handleError(res,reason, message, code){
        
        console.log("ERROR: " + reason);
        
        res.status(code || 500).json({
         
         "error": message   
            
        })
        
    }
    
    
}); //mongodb.MongoClient.connect

