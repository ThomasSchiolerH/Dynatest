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


def distances(places) :
    distance = []
    for i in range(len(places)) : #makes a list of the distances
        if i < len(places)-1 :
            distance.append(round(haversine(places[i][0],places[i][1],places[i+1][0],places[i+1][1])))
    return distance



print("this takes the name of output file, and a RSP file, and returns an Geojson file with all the points and a CSV file with the pictures belonging to the point")
OutputName = input("Name of output file:")
RSP = input("RSP file name: ") 

places = []
distance = []
imagePos = []
segLength = 2
imageNames = ["LcmsSurvey_3050354664_ImageInt_","LcmsSurvey_3050354664_ImageRng_", "LcmsSurvey_3050354664_OverlayInt_", "LcmsSurvey_3050354664_OverlayRng_"]

RSP = open(RSP, 'r')



for line in RSP : #makes a list of koordinates in the RSP files
    if line.find("55.72") > 0 and line.find("12.37") > 0:
        places.append(re.findall(r'\d+\.\d+',line)) #finds all the koordinates in the GPX file. some others may slip by

for line in places : #Delete excess data
    del line[0:3]
    del line[2:]


for i in range(len(places)) : #makes the koordinates floats
    for j in range(2) :
        places[i][j] = float(places[i][j])


places.sort() #Sorts the list.

RSP.close() #dont forget to close 



distance = distances(places) #removes duplicates from the list
'''
while True : 
    check = 0
    for i in range(len(distance)-1):
        if distance[i] == 0 :
            del places[i]
            del distance[i] 
            check = 1
            break        
    distance = distances(places)
    if check > 0:
        check = 0
    else :
        break
'''   


#Make a list of image positions
imagePos.append([places[0][1],places[0][0]])#first image location is first koordinate
del places[0]

i = 0
while len(distance) > 1 and i < 207:#appends all the middle locations
    if distance[0] < segLength:
        distance[1] += distance[0]
        del distance[0]
        del places[0]
    elif distance[0] == segLength:
        imagePos.append([places[0][1],places[0][0]])
        del distance[0]
        del places[0]
        i += 1
    else :
        if distance[0] % 2 != 0:
            distance[1] = distance[1]-1    
        segNr = round(distance[0]/segLength)
        dLat = (places[0][0] - imagePos[-1][1])/segNr
        dLon = (places[0][1] - imagePos[-1][0])/segNr
        for j in range(1, segNr):
            imagePos.append([imagePos[-1][0]+j*dLon, imagePos[-1][1]+j*dLat])
        del distance[0]
        del places[0]
        i += 1
    

print(len(imagePos))    
imagePos.append([places[0][1],places[0][0]])  #append final location  





#for line in distance:
#   print(line)

'''
for i in range(len(distance)) : #makes a list of koordinates. 
    segNr = round(distance[i]/segLength)
    dLat = (places[i+1][0] - places[i][0])/segNr
    dLon = (places[i+1][1] - places[i][1])/segNr
    for j in range(segNr):
        imagePos.append([places[i][1]+j*dLon, places[i][0]+j*dLat])
imagePos.append([places[-1][1],places[-1][0]])
'''

print(len(imagePos))

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
