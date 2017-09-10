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
  mapTypeControl: false,
  fullscreenControl: false
  });
  infowindow=  new google.maps.InfoWindow();
 bounds = new google.maps.LatLngBounds();
  var controls = document.getElementById('maptools');
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controls);
  var mapvenues= document.getElementById('resultlist');
  map.controls[google.maps.ControlPosition.LEFT_CENTER].push(mapvenues);
  var hamburger= document.getElementById('openresult');
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(hamburger);
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
      url: "https://data.ny.gov/resource/7jkw-gj56.json?$where=within_circle(location_points," +self.lat+","+ self.long+", 3000)",//+self.long, //+"&latitude="+ self.lat,
      type: "GET",
      data: {
        "$limit" : 500,
        "$$app_token" : "5lcqVZyuM92WN1xW2rPjFfsNv"
      }
  }).done(function(data) {

    for (var i=0; i<data.length; i++){
      var phonenum= data[i].phone;
      var areacode ="("+ phonenum.slice(0,3)+")";
      var formattedphone= areacode+" "+ phonenum.slice(3,6)+"-"+phonenum.slice(6,10);

      details={
        "name": data[i].market_name,
        "address": data[i].address_line_1,
        "schedule": data[i].operation_hours,
        "schedule_season": data[i].operation_season,
       "longitude": data[i].longitude,
        "latitude": data[i].latitude,
        "phone": formattedphone,
        "link": data[i].market_link
      }
      temp.push(details);
      if(temp.length === data.length){

        callback(temp);
      }
    }

  }).fail(function(status){
    alert("Could not find data in this area");
  });



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
    getFarms(lat,lng,function(result){


        for(var i=0 ; i<result.length; i++){
          this.latlng= new google.maps.LatLng(parseFloat(result[i].latitude),parseFloat(result[i].longitude));
           this.title= result[i].name;
           this.schedule= result[i].schedule;
           this.address= result[i].address;
           this.link = result[i].link;
           this.operation_season= result[i].schedule_season;
           this.phone= result[i].phone;
           self.marker= new google.maps.Marker({
             map: map,
             position: latlng,
             title: title,
             animation: google.maps.Animation.DROP,
             id:i
           });
           self.marker.address= this.address;
           self.marker.season= this.operation_season;
           self.marker.link=this.link;
          self.marker.phone = this.phone;
           self.marker.schedule= this.schedule;
           self.marker.visiblestatus= ko.observable(true);
           array.push(self.marker);
           bounds.extend(self.marker.position);
           self.marker.addListener('click', makeInfowindowListener);

           self.marker.addListener('click', toggleBounce);

         }

         map.fitBounds(bounds);
         callback (markers);





      });

      }

function makeInfowindowListener(){
  populateInfoWindow(this, infowindow);
}
          function populateInfoWindow(marker, infowindow,schedule,address){
              if (infowindow.marker != marker){
                infowindow.marker  = marker;
                var content='<div><strong class="text-center">' + marker.title + '</strong></div>'+
                                       '<hr>'+
                                        '<div><p><strong>Address: </strong>'+ marker.address +
                                        '<br><br><strong>Phone: </strong>'+ marker.phone +
                                        '<br><br><strong>Months of Operation: </strong>'+
                                        marker.season +"<br><br><strong>Hours: </strong>"+ marker.schedule +
                                        '<br><br><strong>Link: </strong><a href='+ marker.link+'>'+marker.link+'</a><br></p></div>';
                infowindow.setContent(content);
                infowindow.open(map,marker);
                infowindow.addListener('closeclick', function(){

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

      getResults(40.785091,-73.968285, markers, function(locationlist){
          for(var i =0; i<locationlist.length; i++){
              self.locations.push(locationlist[i]);
              }

              return self.locations();
      });



        return self.locations();
    },this);

      this.queryData = ko.pureComputed({
            read: self.query,
            write: function (value) {

              var lowercase = value.toLowerCase();
              var filteredfarms = [];
              for(var i =0; i<self.marketdata().length; i++){
                  if(self.marketdata()[i].title.toLowerCase().search(lowercase)>=0){
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

            populateInfoWindow(this,infowindow,this.schedule, this.address);


        };
        self.closetab = function(){
           $("#resultlist").css({"width": 0});
        }
        self.opentab = function(){
           if (window.screen.availWidth > 700){
              $("#resultlist").css({"width": 40+"%"});
           }
           else{
             $("#resultlist").css({"width": 50+"%"});
           }
        }

  };


var viewmodel = new ViewModel();
  ko.applyBindings(viewmodel);
