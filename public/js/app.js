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
    .controller("mainController", function($scope, $rootScope){
        
        
        
    })