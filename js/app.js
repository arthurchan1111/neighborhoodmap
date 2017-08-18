var map;
var infowindow;
var latlng;
var bounds;
var details = {};
var temp=[];
var markers =[];

/**
* @description Callback function for google maps api to load the map
*/

function initMap(){

  map = new google.maps.Map(document.getElementById('map'),{
  center: {lat: 40.785091, lng: -73.968285},
  zoom: 10,
  mapTypeControl: false
  });
  infowindow=  new google.maps.InfoWindow();
 bounds = new google.maps.LatLngBounds();
  var controls = document.getElementById('maptools');
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(controls);

}

/**
* @description The getFarms function takes in a latitude and longitude coordinates
*              passes them in as an AJAX request to the usda server and after calls back
*              with arrays containing the ids and name of all the Farmers Markets nearby
* @param {Float} lat latitude
* @param {Float} long longitude
* @param {Function} callback (ids,name,length): called after calculation
*/

function getFarms(lat, long, callback){
  var self = this;
  self.lat = lat;
  self.long = long;
  $.ajax({
        type: "GET",
        contentType: "application/json; charset=utf-8",
         url: "https://search.ams.usda.gov/farmersmarkets/v1/data.svc/locSearch?lat=" + self.lat + "&lng=" + self.long,
        dataType: 'jsonp',
        //jsonpCallback: 'searchResultsHandler',
        success: function(searchResults){
          var ids = [];
          var name= [];
          var length= searchResults.results.length;

            var results;
      for (var key in searchResults){
        results = searchResults[key];
    }

      for(var i=0; i<results.length; i++){
        var marketname= results[i].marketname;
        var indexofdecimal= results[i].marketname.indexOf(".") + 2;
        var newname=  results[i].marketname.substring(indexofdecimal);
        ids.push(results[i].id);
        name.push(newname);
      }
        callback(ids,name, length);
    },
    error: function(message){
      alert("Could not retrieve any farmers markets within your area");
    }

});
}
/**
* @description The getDetails function takes the name and id array and iteratively used
*              to get market information of each farmer market. The final array is then called
*              back.
* @param {Object} id Array that contains id of farms
* @param {Object} name Array that contains name of the farms
* @param {Int} length Length of how many farms there are
* @param {Function} callback (temp): called after calculation
*
*/
function getDetails(id, name,length, callback){

  for (var i =0; i<id.length; i++){
  (function(i){ $.ajax({
      type: "GET",
      contentType: "application/json; charset=utf-8",
      // submit a get request to the restful service mktDetail.
      url: "https://search.ams.usda.gov/farmersmarkets/v1/data.svc/mktDetail?id=" + id[i],
      dataType: 'jsonp',
      success: function(data){

          var string= data.marketdetails.GoogleLink.slice(26,data.marketdetails.GoogleLink.indexOf("\(")-3);
          var pos = string.split("%2C%20");
          var indexoftags= String(data.marketdetails.Schedule).indexOf(";");
          var parsedschedule= String(data.marketdetails.Schedule).slice(0,indexoftags);

          details={"name":name[i],
                          "address": data.marketdetails.Address,
                          "schedule": parsedschedule,
                          "products": data.marketdetails.Products,
                          "latitude": pos[0],
                          "longitude": pos[1]
                        };
                temp.push(details);
                if(temp.length == length){
                  return callback(temp);
                }


      },
      error: function(message){
        alert("Could not data about the farmers market");
      }

    });

  })(i);
}
}
/**
* @description The getResults function gets the callback from both previous functions
*              and initializes the markers and infowindow onto the google map
* @param {Float} lat latitude
* @param {Float} lng longitude
* @param {Object} array Placeholder for markers array
* @param {Function} callback (markers): called after calculation
*
*/

  function  getResults(lat, lng, array, callback){
    getFarms(lat,lng,function(id,name,length){
      getDetails(id,name,length,function(locations){
             for (var i=0; i<locations.length; i++){

                this.latlng= new google.maps.LatLng(parseFloat(locations[i].latitude),parseFloat(locations[i].longitude));
                this.title= locations[i].name;
                this.schedule= locations[i].schedule;
                this.address= locations[i].address;

                this.product= locations[i].products;
                self.marker= new google.maps.Marker({
                  map: map,
                  position: latlng,
                  title: title,
                  animation: google.maps.Animation.DROP,
                  id:i
                });
                self.marker.address= this.address;
                self.marker.product= this.product;
                self.marker.schedule= this.schedule;
                self.marker.visiblestatus= ko.observable(true);
                array.push(self.marker);
                bounds.extend(self.marker.position);
                 self.marker.addListener('click',  function(){

                  populateInfoWindow(this, infowindow);
                });

                self.marker.addListener('click', toggleBounce);

              }

              map.fitBounds(bounds);
              callback (markers);

          });
        });
    }

          function populateInfoWindow(marker, infowindow,schedule,address,product){
              if (infowindow.marker != marker){
                infowindow.marker  = marker;
                var content='<div>' + marker.title + '</div>'+
                                       '<hr>'+
                                        '<div><p><strong>Address: </strong>'+ marker.address +
                                        '<br><br><strong>Products: </strong>'+ marker.product
                                        + '<br><br><strong>Schedule: </strong>'+
                                        marker.schedule+'<br></p></div>';
                infowindow.setContent(content);
                infowindow.open(map,marker);
                infowindow.addListener('closeclick', function(){
                  //infowindow.setContent(null);
                  infowindow.setMarker=null;
                  marker.setAnimation(null);
                });

              }
          }

function toggleBounce(){
  if (this.getAnimation() !== null) {
    this.setAnimation(null);
  } else {
    var marker= this;
    this.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
                marker.setAnimation(null);
            }, 1000);
  }
}


  var ViewModel = function(){
   var self = this;
   this.title;
   this.latlng;
   self.query = ko.observable();
   self.locations = ko.observableArray();
/**
* @description Computed function gets location if user accepts yes and falls back on default location if an error or user
*              declines.
*/
    self.marketdata = ko.computed(function(){
      if(navigator.geolocation){

        navigator.geolocation.getCurrentPosition(function(position){
        var pos={
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        map.setCenter(pos);
        map.setZoom(10);
        getResults(position.coords.latitude, position.coords.longitude, markers, function(locationlist){
            for(var i =0; i<locationlist.length; i++){
                self.locations.push(locationlist[i]);
                }

                return self.locations()
        });

      }, function(){
        getResults(40.785091,-73.968285, markers, function(locationlist){
            for(var i =0; i<locationlist.length; i++){
                self.locations.push(locationlist[i]);
                }

                return self.locations()
        });

      })
    }
      else{
        getResults(40.785091,-73.968285, markers,function(locationlist){
            for(var i =0; i<locationlist.length; i++){
                self.locations.push(locationlist[i]);
                }

                return self.locations()
        });
      }
        return self.locations()
    },this);

      this.queryData = ko.pureComputed({
            read: self.query,
            write: function (value) {
              console.log(value);
              var lowercase = value.toLowerCase();
              var filteredfarms = [];
              for(var i =0; i<self.marketdata().length; i++){
                  if(self.marketdata()[i].title.toLowerCase().search(lowercase)>=0 || self.marketdata()[i].product.toLowerCase().search(lowercase)>=0){
                      self.marketdata()[i].setMap(map);
                      self.marketdata()[i].visiblestatus(true);

                  }
                  else{
                    self.marketdata()[i].setMap(null);
                    self.marketdata()[i].visiblestatus(false);
                  }


              }
            },
            owner: this
        });
        self.openWindow= function(){

            populateInfoWindow(this,infowindow,this.schedule, this.address, this.product);


        };


  }


var viewmodel = new ViewModel();
  ko.applyBindings(viewmodel);
