import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Polygon, Polyline, mapKit } from 'react-native-maps';
import * as Location from 'expo-location'; // Import expo-location
import { MaterialIcons } from '@expo/vector-icons'; // Import icon library
import fetch from 'node-fetch';
import Icon from 'react-native-vector-icons/FontAwesome';

const LATITUDE = 31.63416;
const LONGITUDE = -7.99994;
const LATITUDE_DELTA = 0.1;
const LONGITUDE_DELTA = 0.1;

let id = 0;

const GoogleMapsScreen = () => {
  const [region, setRegion] = useState({
    latitude: LATITUDE,
    longitude: LONGITUDE,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });

  const [markers, setMarkers] = useState([]);
  const [polylineCoords, setPolylineCoords] = useState([]);
  const [polygonCoords, setPolygonCoords] = useState([]);
  const [heading, setHeading] = useState(0); // State to hold user's heading

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch("http://10.10.1.101:3000/api/Allzones");
        if (response.ok) {
          const data = await response.json();
          setPolygonCoords(data);
        } else {
          console.error('Failed to fetch zones from database');
        }
      } catch (error) {
        console.error('Error fetching zones:', error);
      }
    };

    fetchZones();
  }, []);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Please grant permission to access your location in order to use this feature.',
            [{ text: 'OK', onPress: () => Location.openSettings() }]
          );
        } else {
          subscribeToHeading(); // If permission is granted, subscribe to heading updates
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Permission denied, handle gracefully
        Alert.alert(
          'Permission Denied',
          'Please grant permission to access your location in order to use this feature.',
          [{ text: 'OK', onPress: () => Location.openSettings() }]
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        ...region,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error fetching current location:', error);
    }
  };

  const subscribeToHeading = async () => {
    try {
      await Location.watchHeadingAsync((newHeading) => {
        setHeading(newHeading.trueHeading || 0); // Use trueHeading if available
      });
    } catch (error) {
      console.error('Error subscribing to heading:', error);
    }
  };

  const iconRotation = heading ? heading * Math.PI / 180 : 0;

  const onMarkerDragEnd = (e, markerKey) => {
    const newCoordinate = e.nativeEvent.coordinate;
    setMarkers((prevMarkers) =>
      prevMarkers.map((marker) =>
        marker.key === markerKey
          ? { ...marker, coordinate: newCoordinate }
          : marker
      )
    );
    setPolylineCoords((prevCoords) =>
      prevCoords.map((coord, index) =>
        markers[index]?.key === markerKey ? newCoordinate : coord
      )
    );
  };

  const deleteLastMarker = () => {
    setMarkers((prevMarkers) => {
      const newMarkers = [...prevMarkers];
      newMarkers.pop(); // Remove the last marker
      return newMarkers;
    });
    setPolylineCoords((prevCoords) => {
      const newCoords = [...prevCoords];
      newCoords.pop(); // Remove the last coordinate
      return newCoords;
    });
  };
  const saveCoordAndZone = async () => {

    Alert.alert(
      "Save Zone",
      "Are you sure you want to Save this Zone ",
      [
          {
              text :"No", onPress : ()=> {
                setMarkers([]);
                setPolylineCoords([]);
              }
          },

          {
              text :"Yes", onPress : async()=> {
                if (markers.length > 0) {
                  const markerData = markers.map((marker, index) => ({
                    longitude: marker.coordinate.longitude,
                    latitude: marker.coordinate.latitude,
                    order: index,
                  }));
            
                  console.log('Markers to be saved:');
                  markerData.forEach((marker, index) => {
                    console.log(`Marker ${index + 1}:`, marker);
                  });
            
                  const closedPolylineCoords = [...polylineCoords, polylineCoords[0]];
                  setPolylineCoords(closedPolylineCoords);
            
                  try {
                    console.log({ coordinates: markerData });
                    const response = await fetch("http://10.10.1.101:3000/api/zones", {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ coordinates: markerData }),
                    });
            
                    if (response.ok) {
                      const data = await response.json();
                      setMarkers([]);
                      setPolylineCoords([]);
                      setPolygonCoords((prevCoords) => [...prevCoords, markerData]);
                      console.log("asdancakc" ,polylineCoords);
                    } else {
                      console.error('Failed to save data to database');
                    }
                  } catch (error) {
                    console.error('Error saving data to database:', error);
                  }
                } else {
                  console.log('No markers to save.');
                }
              }
          },
          {defaultIndex : 1}
      ]
  )

  };


  const onMapPress = (e) => {
    setPolylineCoords([]);
    const newMarker = {
      coordinate: e.nativeEvent.coordinate,
      key: id++,
    };
    setMarkers([...markers, newMarker]);
    setPolylineCoords([...polylineCoords, e.nativeEvent.coordinate]);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        provider={mapKit}
        initialRegion={region}
        onPress={onMapPress}
      >
        {/* Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.key}
            coordinate={marker.coordinate}
            pinColor='red'
            draggable
            onDragEnd={(e) => onMarkerDragEnd(e, marker.key)}
          />
        ))}

        {/* Polyline */}
        <Polyline coordinates={polylineCoords} strokeColor="#FF0000" strokeWidth={2} />

        {/* Polygon */}
        {polygonCoords.map((coordinates, index) => (
          <Polygon
            coordinates={coordinates}
            key={index}
            fillColor="rgba(0, 200, 0, 0.5)"
            strokeColor="rgba(0,0,0,0.5)"
            strokeWidth={2}
          />
        ))}

        {/* Current Location Marker */}
        <Marker
          coordinate={{
            latitude: region.latitude,
            longitude: region.longitude,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={999} // To make sure it's above other markers
        >
          <Icon name="location-arrow" size={30} color="red" />
        </Marker>
      </MapView>

      <View style={styles.buttonContainer}>
        <Button title="Delete Last Marker" onPress={deleteLastMarker} style={styles.button} />
        <Button title="Save" onPress={saveCoordAndZone} style={styles.button} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  button: {
    fontSize: 20,
  },
  text: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default GoogleMapsScreen;
