'use strict';

angular.module('stofmaApp.services');

angular.module('stofmaApp.services')
    .factory('ProductFactory', ['$q', '$http', function ($q, $http) {
      var factory = {
        getProducts: getProductsFn
      };

      function getProductsFn() {
        var defer = $q.defer();

        $http.post('/product/search').success(function (data) {
          var r = data;

          // Fix the number of selected product to 0
          r = r.map(function(o){
            o.selected = 0;
            return o;
          });

          defer.resolve(r);
        }).error(function (err) {
          defer.reject();
        });

        return defer.promise;
      }

      return factory;
    }]);
