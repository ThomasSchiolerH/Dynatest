import re
import csv
from geojson import MultiLineString, Feature, FeatureCollection, dump
from math import radians, cos, sin, atan2, sqrt



def haversine(lat1, lon1, lat2, lon2): #imported haversine formular to calculate distance, found here https://stackoverflow.com/questions/4913349/haversine-formula-in-python-bearing-and-distance-between-two-gps-points
    """
    Calculate the great circle distance in kilometers between two points 
    on the earth (specified in decimal degrees)
    """
    # convert decimal degrees to radians
    dlon = lon2 - lon1 
    dlat = lat2 - lat1  
    lon1, lat1, lon2, lat2, dlon, dlat = map(radians, [lon1, lat1, lon2, lat2, dlon, dlat])

    # haversine formula 
    a = sin(dlat/2) * sin(dlat/2) + cos(lat1) * cos(lat2) * sin(dlon/2) * sin(dlon/2)
    c = 2 * atan2(sqrt(a),sqrt(1-a)) 
    r = 6371000 # Radius of earth in kilometers. Use 3956 for miles. Determines return value units.
    return c * r

print("this takes the name of output file, and a GPX file, and returns an Geojson file with all the points and a CSV file with the pictures belonging to the point")
OutputName = input("Name of output file:")
gpx = input("GPX file name: ") 

places = []
distance = []
imagePos = []
segLength = 2
imageNames = ["LcmsResult_ImageInt_","LcmsResult_ImageRng_", "LcmsResult_OverlayInt_", "LcmsResult_OverlayRng_"]

GPX = open(gpx, 'r')



for line in GPX : #makes a list of koordinates in the GPX files
    if line.find("rtept ") > 0 :
        places.append(re.findall(r'\d+\.\d+',line)) #finds all the koordinates in the GPX file


for i in range(len(places)) : #makes the koordinates floats
    for j in range(2) :
        places[i][j] = float(places[i][j])

GPX.close() #dont forget to close 

for i in range(len(places)) : #makes a list of the distances
    if i < len(places)-1 :
        places = places
        distance.append(round(haversine(places[i][0],places[i][1],places[i+1][0],places[i+1][1])))


for i in range(len(distance)) : #makes a list of koordinates. 
    segNr = round(distance[i]/segLength)
    dLat = (places[i+1][0] - places[i][0])/segNr
    dLon = (places[i+1][1] - places[i][1])/segNr
    for j in range(segNr):
        imagePos.append([places[i][1]+j*dLon, places[i][0]+j*dLat])
imagePos.append([places[-1][1],places[-1][0]])


#make GeoJson
multiLineString = []

for i in range(0,len(imagePos),2):
    if i+1 < len(imagePos):
        multiLineString.append([imagePos[i], imagePos[i+1]])



multilinestring = MultiLineString(multiLineString)

features = []
features.append(Feature(geometry = multilinestring))

feature_collection = FeatureCollection(features)

with open(OutputName+'.json', 'w') as f:
    dump(multilinestring, f)

#makes CSV output file

for i in range(len(imagePos)) :#appends the picture names
    for j in range(len(imageNames)):
        imagePos[i].append(imageNames[j]+f'{i:06}')

f = open(OutputName+'.csv','w')
writer = csv.writer(f)

for i in range(len(imagePos)):
    writer.writerow(imagePos[i])

f.close()


