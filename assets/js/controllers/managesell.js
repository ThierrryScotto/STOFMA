'use strict';

angular.module('stofmaApp.controllers')

    .controller('ManageSellCtrl', ['$scope', '$state', '$stateParams', '$q', 'productsData', 'usersData', 'ProductService', 'ProductFactory', 'SaleService', '$mdBottomSheet', 'SweetAlert', 'PaymentService', 'PaymentFactory', 'UserFactory', '$mdToast', function ($scope, $state, $stateParams, $q, productsData, usersData, ProductService, ProductFactory, SaleService, $mdBottomSheet, SweetAlert, PaymentService, PaymentFactory, UserFactory, $mdToast) {
      $scope.products = productsData;

      $scope.isEditing = false;
      var paymentModeSale = null;

      $scope.canBeGuest = false;
      $scope.users = UserFactory.onlyRealUsers(usersData, function () {
        $scope.canBeGuest = true;
      });

      $scope.customer = null;
      $scope.sum = 0.0;

      $scope.refreshProduct = function () {
        ProductService.getProducts(true).then(function (data) {
          $scope.products = data;
        });
      };

      if (angular.isDefined($stateParams.id)) {
        // If edit

        $scope.isEditing = true;
        $scope.editSaleId = $stateParams.id;

        SaleService.getSale($scope.editSaleId, true).then(function (s) {
          if (s.customer.id == UserFactory.getGuestUserId())
            $scope.guest = true;
          else
            $scope.customer = UserFactory.remap(s.customer);

          paymentModeSale = s.payment.type;

          angular.forEach(s.products, function (sp) {
            for (var i = 0; i < $scope.products.length; i++) {
              if ($scope.products[i].id == sp.product.id) {
                $scope.products[i].selected = sp.quantity;
                break;
              }
            }
          })
        });
      }

      // Auto-complete part

      $scope.getMatches = getMatches;
      $scope.searchUserText = '';

      function getMatches(query) {
        return query ? $scope.users.filter(function (u) {
          return angular.lowercase(u.getName()).indexOf(angular.lowercase(query)) >= 0;
        }) : $scope.users;
      }

      // End of Auto-complete part

      $scope.$watch('customer', function () {
        updateLevelPrice();
      });

      $scope.$watch('guest', function () {
        updateLevelPrice();
      });

      function updateLevelPrice() {
        if (angular.isDefined($scope.guest) && $scope.guest === true) {
          $scope.levelPrice = ProductFactory.getLevelPrice(false);
        } else if (angular.isDefined($scope.customer) && $scope.customer !== null) {
          $scope.levelPrice = ProductFactory.getLevelPrice($scope.customer.isMember);
        }
      }

      $scope.computeSum = function (sum) {
        $scope.sum = sum;
      };

      $scope.confirmSelling = function ($event) {
        if ($scope.customer === null && !$scope.guest) {
          $mdToast.show(
              $mdToast.simple()
                  .content('Veuillez sélectionner la personne à servir.')
                  .position("bottom right")
                  .hideDelay(5000)
          );
          return;
        }

        var products = $scope.products.filter(function (o) {
          return o.selected > 0;
        });

        $mdBottomSheet.show({
          templateUrl: 'assets/js/components/bottom-sheet/bottom-sheet-confirm-selling.html',
          controller: 'BottomSheetConfirmSellCtrl',
          targetEvent: $event,
          locals: {
            productsToSell: products,
            sum: $scope.sum,
            paymentMode: paymentModeSale,
            guest: $scope.guest === true
          }
        }).then(function (response) {
          if (response.confirm) {
            var customerId = $scope.guest ? UserFactory.getGuestUserId() : $scope.customer.id,
                customerName = customerId == UserFactory.getGuestUserId() ? 'votre invité' : $scope.customer.getName();

            if (!$scope.isEditing) {
              SaleService.doSale(customerId, products, response.paymentMode).then(function (newSale) {
                SweetAlert.swal({
                  title: 'Vente terminée pour ' + customerName + '!',
                  type: 'success'
                }, function (ok) {
                  if (ok) {
                    $scope.refreshProduct();
                    $scope.customer = undefined;
                    $scope.searchUserText = '';
                    $scope.guest = false;
                  }
                });
              }).catch(function () {
                SweetAlert.swal({
                  title: 'La vente n\'a pas réussi.',
                  text: 'Merci de recréditer le solde de ' + customerName + '.',
                  type: 'error'
                });
              })
            } else {
              SaleService.editSale($scope.editSaleId, customerId, products, response.paymentMode).then(function (newSale) {
                SweetAlert.swal({
                  title: 'Vente modifiée',
                  type: 'success'
                }, function (ok) {
                  if (ok) {
                    $state.go('manager.sales');
                  }
                });
              }).catch(function () {
                SweetAlert.swal({
                  title: 'La vente n\'a pas été modifiée.',
                  text: 'Merci de recréditer le solde de ' + customerName + '.',
                  type: 'error'
                });
              })
            }

          }
        });
      }
    }]);