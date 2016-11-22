/*global angular*/
/*global Image*/
/*global $*/

angular.module("picsApp", ['ngRoute'])
  //create Angular JS app and inject ngRoute module
  .config(function($routeProvider) {
    $routeProvider
      .when("/", {
        templateUrl: "home.html",
        controller: "HomeController"
      })
      .when("/mypics", {

        templateUrl: "mypics.html",
        controller: "MyPicsController"

      });
  })
  .service("Login", function($http) {
    //service to be called in main controller to check if a user is logged in
    //via req.isAuthenticated in Node JS server side
    //returns user if a user is logged in

    this.isLoggedIn = function() {

      return $http.get("/loggedin");

    };

  })
  .service("Users", function($http) {

    this.retrieveUser = function(url) {

      return $http.get(url);

    };

  })
  .service("Pins", function($http, $q) {

    this.checkImage = function(src) {

      var deferred = $q.defer();
      //create a deferred object first that will be resolved or rejected

      var image = new Image();
      //new image Object

      image.onerror = function() {
        //this function will be called when the image does not load      

        deferred.resolve(false);

      };

      image.onload = function() {
        //this function will be called when the image loads
        deferred.resolve(true);

      };

      image.src = src;

      return deferred.promise;

    };

    this.addPicture = function(pic) {
      //method to add a pin to the database by calling RESTful API    

      return $http.post("/addpicture", pic);

    };

    this.retrieveAllPins = function() {
      //method to retrieve all the pins in the database    
      return $http.get("/retrieveallpins");

    };

    this.retrieveUserPins = function() {
      //method to retrieve all pins belonging to user

      return $http.get("/retrieveuserpins");


    };

    this.deleteUserPic = function(picObject) {
      //method to delete a pic belonging to user
      //called from MyPicsController

      return $http.post("/deleteuserpic", picObject);

    };

    this.editLikes = function(pic) {
      //method to remove or add likes

      return $http.post("/editlikes", pic);


    };

  })
  .controller("mainController", function($scope, $rootScope, Login, Users, Pins) {
    //mainController is loaded in index.html 

    Login.isLoggedIn()
      //every time main controller is loaded, we check if a user is logged in
      .then(function(response) {
        //server returns data from Passport JS    
        //server returns '0' if no user is authenticated 
        //server returns 'req.user' if a user is authenticated

        if (response.data == '0') {

          console.log("we could not find a user!");

          $rootScope.loggedIn = false;

        } else {

          console.log("We found a user!");

          $rootScope.loggedIn = true;
          //$rootScope.userObject = response.data._json;

          $scope.userID = response.data.id;

          var url = "/retrieveuser/" + $scope.userID;

          Users.retrieveUser(url)
            //find the user in the database (including all the pins) and bind to $rootScope
            //so we have access to the current user including all the pins in All Controllers
            .then(function(response) {

              console.log("Successfully retrieved current user from DB");
           
              $rootScope.currentUser = response.data;


            }, function(response) {

              console.log("Error retrieving current user from DB");

            }); //Users.retrieveUser(url)

          Pins.retrieveUserPins()
            //retrieve all pins belonging to user that is logged in
            .then(function(response) {


              $rootScope.userPins = response.data;

            }, function(response) {

              console.log("Error retrieving all pins belonging to logged in user");

            }); // Pins.retrieveUserPins()


        }

      }); //.then(function(response)

    Pins.retrieveAllPins()
      //retrieve all pics here and bind to $rootScope.allPins
      .then(function(response) {


        $rootScope.allPins = response.data;

      }, function(response) {

        console.log("Error retrieving all pins from database");

      });


    $scope.addPic = function(pic) {

      //check if pic url is valid

      Pins.checkImage(pic.url)
        //first check if the image is valid or not
        //by calling the checkImage service, returns true or false
        .then(function(response) {

          if (response === false) {
            //if image is not valid, we replace the pic URL with a placeholder image
            pic.url = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Brother_cream_in_stall.jpg/220px-Brother_cream_in_stall.jpg";

          }

          Pins.addPicture(pic)
            //once image is checked, we add the pic to the database
            //embedded in the call back function of the checkImage call
            .then(function(response) {

              //response.data is the pinObject that was inserted in the database

              var o_id = response.data._id;
              //save the objectID of the inserted pin

              var o_id_string = o_id.toString();
              //convert objectID to string

              $rootScope.allPins.push(response.data);
              //add the inserted Pin to the rootScope of all pins
              $rootScope.userPins.push(response.data);
              //add the inserted Pin to the rootScope of all pins belonging to logged in User
              $rootScope.currentUser.pins.push(o_id_string);
              //add the inserted Pin object ID to the rootScope of the current user


            }, function(response) {

              console.log("Error adding picture to database");

            });

        }, function(response) {
          //error handling for checking image    

          console.log("Error checking if image is valid");

        });


    };

    $rootScope.editLikes = function(pic) {
      //method to add or remove likes for the user  

      Pins.editLikes(pic)
        .then(function(response) {

          console.log("Successfully edited likes");
          //update scope for $rootScope.allPins

          $rootScope.allPins.forEach(function(item, index) {
            //loop through allPins of $rootScope and find the pin that matches the pic to be edited from front-end  

            if (item._id === pic._id) {
              //find item of $rootScope allPins matches pic_id
              if (item.likes.indexOf(pic.userID) === -1) {
                //userID doest not exist in likes array

                $rootScope.allPins[index].likes.push(pic.userID);
                //add the userID to the likes array of $rootScope


              } else {
                //userID exists in likes array  

                var indexDelete = item.likes.indexOf(pic.userID);
                //find the index where the userID exists in likes array

                $rootScope.allPins[index].likes.splice(indexDelete, 1);
                //delete the userID from likes array in rootScope
                //splice removes an element

              }


            }

          });

        }, function(response) {

          console.log("Error editing likes");

        });


    };


  })
  .controller("HomeController", function($scope, $rootScope){
    
    
    
  })
  .controller("MyPicsController", function($scope, $rootScope, Pins) {
    //controller for the mypics.html view  

    $scope.deletePic = function(pic) {

      Pins.deleteUserPic(pic)
        .then(function(response) {

          //delete pin in database successfull, update $rootScope here

          var indexPin = 0;

          $rootScope.allPins.forEach(function(item, index) {
            //every element of allPins is an object of a pin

            if (item._id === pic._id) {
              //if the _id of pic chosen matches item._id save the index  

              indexPin = index;

            }

          }); //$rootScope.allPins.forEach

          $rootScope.allPins.splice(indexPin, 1);

          var indexUser = 0;

          $rootScope.userPins.forEach(function(item, index) {
            //every element of userPins is an object of a pin

            if (item._id === pic._id) {
              //if the _id of pic chosen matches item._id save the index  

              indexUser = index;

            }

          }); //$rootScope.userPins.forEach

          $rootScope.userPins.splice(indexUser, 1);


          //$rootScope.currentUser.pins.push(o_id_string);
          //add the inserted Pin object ID to the rootScope of the current user

          var indexReference = 0;

          $rootScope.currentUser.pins.forEach(function(item, index) {
            //every element of userPins is an object of a pin

            if (item === pic._id) {
              //if the _id of pic chosen matches item._id save the index  

              indexReference = index;

            }

          }); //$rootScope.userPins.forEach

          $rootScope.currentUser.pins.splice(indexReference, 1);


        }, function(response) {

          console.log("Error deleting pic belonging to user");

        })


    };

  })
  .service('authInterceptor', function($q) {
    //service to intercept a 401 response from Express REST API if user is not authenticated for a protected endPoint 

    var service = this;

    service.responseError = function(response) {
      //make a authIntercepter.responseError() method that takes a server response 

      if (response.status == 401) {
        //if response error status is 401 redirect to login URL 

        window.location = "/auth/twitter";

      }

      return $q.reject(response);
      //if the response error status is something other than 401 reject the promise with the response

    };


  })
  .config(['$httpProvider', function($httpProvider) {
    //add authInterceptor service to httpProvider so its used in    

    $httpProvider.interceptors.push('authInterceptor');
  }]);