angular.module('stofmaApp.components')
    .controller('DialogProductController', ['$scope', '$mdDialog', 'ProductService', 'categories', 'title', 'product', function ($scope, $mdDialog, ProductService, categories, title, product) {
      $scope.title = title;
      $scope.categories = categories;

      if (product) {
        $scope.category = product.category;
        $scope.name = product.name;
        $scope.shortname = product.shortName;
        $scope.unitPrice = product.price;
        $scope.unitPriceMember = product.memberPrice;
        $scope.minimum = product.minimum;
        $scope.urlImage = product.urlImage;
        $scope.forSale = product.forSale;
        $scope.quantity = product.quantity;
      }

      $scope.submit = function () {
        var form = $scope.editProduct,
            category = form.category.$modelValue,
            name = form.name.$modelValue,
            shortName = form.shortname.$modelValue,
            price = parseFloat(form.unitPrice.$modelValue),
            memberPrice = parseFloat(form.unitPriceMember.$modelValue),
            minimum = parseInt(form.minimum.$modelValue),
            urlImage = form.urlImage.$modelValue,
            forSale = form.forSale.$modelValue;

        if (!forSale) {
          var quantity = form.quantity.$modelValue;
        }

        if (isNaN(price) || price < 0)
          form.unitPrice.$setValidity('notaprice', false);
        else
          form.unitPrice.$setValidity('notaprice', true);

        if (isNaN(minimum) || minimum < 0)
          form.minimum.$setValidity('notanumber', false);
        else
          form.minimum.$setValidity('notanumber', true);

        if (form.$valid) {
          var data = {
            category: category,
            name: name,
            shortName: shortName,
            price: '' + price,
            memberPrice: '' + memberPrice,
            minimum: minimum,
            urlImage: urlImage,
            forSale: forSale
          };

          if (!forSale) {
            data.quantity = quantity;
          }

          $mdDialog.hide(data);
        }
      };

      $scope.cancel = function () {
        $mdDialog.cancel();
      };
    }]);
