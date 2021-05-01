
from bs4 import BeautifulSoup

import glob
import os.path

def parseTCX(filename):
    file = open(filename)

    xml_file = file.read()

    soup = BeautifulSoup(xml_file, 'lxml')

    id = soup.find("id").text

    lats = []
    longs = []

    for tag in soup.find_all("trackpoint"):
        lats.append(tag.find("latitudedegrees").text)
        longs.append(tag.find("longitudedegrees").text)

    return id[:-10], lats, longs


def single_run(id, lats, longs):
    locString = ""
    for i in range(0, len(lats)):
        locString += longs[i] + "," + lats[i] + " "
    value = """
    <Placemark>
        <name>{0}</name>
        <description>xx Miles</description>
        <Style>
          <LineStyle>
            <color>ff0000e6</color>
            <width>4</width>
          </LineStyle>
        </Style>
        <LineString>
          <tessellate>1</tessellate>
          <altitudeMode>clampToGround</altitudeMode>
          <coordinates>{1}</coordinates>
        </LineString>
    </Placemark>
    """

    return value.format(id, locString)

def convertToKML():
    base_path = os.path.dirname(os.path.realpath(__file__))
    files = glob.glob(base_path + "/tcx/*.tcx")

    header = """<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name><![CDATA[38415617200]]></name>
    <visibility>1</visibility>
    <open>1</open>
    <Folder id="Runs">
      <name>Tracks</name>
      <visibility>1</visibility>
      <open>0</open>
    """
    footer = """
        </Folder>
  </Document>
</kml>
    """

    o_file = open("outputKML.kml", "w")

    o_file.write(header)

    for file in files:
        id, lats, longs = parseTCX(file)
        o_file.write(single_run(id, lats, longs))
    print(files)

    o_file.write(footer)
    o_file.close()

convertToKML()