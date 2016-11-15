/*global angular*/

angular.module("picsApp", ['ngRoute'])
    //create Angular JS app and inject ngRoute module
    .config(function($routeProvider){
        $routeProvider
            .when("/", {
                templateUrl: "home.html",
                controller: "HomeController"
            });
    })
    .service("Login", function($http){
    //service to be called in main controller to check if a user is logged in
    //via req.isAuthenticated in Node JS server side
    //returns user if a user is logged in
        
        this.isLoggedIn = function(){
            
            return $http.get("/loggedin");
            
        }
        
    })
    .controller("mainController", function($scope, $rootScope, Login){
    //mainController is loaded in index.html 
    
        Login.isLoggedIn()
        //every time main controller is loaded, we check if a user is logged in
        .then(function(response){
        //server returns '0' if no user is authenticated
        //server returns 'req.user' if a user is authenticated
            
            if(response.data == '0'){
                
                console.log("we could not find a user!");
                
                $rootScope.loggedIn = false;
                
            } else {
                
                console.log("We found a user!");
                console.log (response.data)
                
                $rootScope.loggedIn = true;
                $rootScope.userObject = response.data._json;
                
            }
            
        });
        
        
    })
    .controller("HomeController",function($scope){
        
        
        
        
    })
    .service('authInterceptor', function($q) {
    //service to intercept a 401 response from Express REST API if user is not authenticated for a protected endPoint 

    var service = this;

    service.responseError = function(response) {
      //make a authIntercepter.responseError() method that takes a server response 

      if (response.status == 401) {
        //if response error status is 401 redirect to login URL 

        window.location = "/auth/facebook";

      }

      return $q.reject(response);
      //if the response error status is something other than 401 reject the promise with the response

    };


  })
  .config(['$httpProvider', function($httpProvider) {
    //add authInterceptor service to httpProvider so its used in    

    $httpProvider.interceptors.push('authInterceptor');
  }]);
