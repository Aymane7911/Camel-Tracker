// app/api/camels/[camelId]/route.ts
import { NextResponse } from 'next/server';
import { AzureBlobService } from '@/lib/azure';
import { csvParser } from '@/lib/csvParser';

// Helper function to convert speed from m/s to km/h
const convertSpeedToKmh = (data: any[]) => {
  return data.map(row => ({
    ...row,
    Speed: row.Speed ? row.Speed * 3.6 : 0 // Convert m/s to km/h
  }));
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ camelId: string }> }
) {
  try {
    const { camelId } = await params;
    const { searchParams } = new URL(request.url);
    const raceBlob = searchParams.get('race');
    
    const azureService = new AzureBlobService('trainingdata');
    const allBlobs = await azureService.listBlobs();
    
    const camelRaces = allBlobs.filter(blob => 
      blob.name.startsWith('race_') && 
      blob.name.endsWith('.csv') &&
      blob.name.includes(`_${camelId}.csv`)
    );
    
    if (camelRaces.length === 0) {
      return NextResponse.json({ 
        error: `No races found for camel ${camelId}` 
      }, { status: 404 });
    }
    
    if (raceBlob) {
      const specificRace = camelRaces.find(b => b.name === raceBlob);
      if (!specificRace) {
        return NextResponse.json({ 
          error: `Race ${raceBlob} not found for camel ${camelId}` 
        }, { status: 404 });
      }
      
      console.log(`📥 Fetching race data: ${specificRace.name}`);
      const csvContent = await azureService.downloadBlob(specificRace.name);
      const parsedData = await csvParser.parseFromString(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimiter: '',
        delimitersToGuess: [',', ';', '\t', '|']
      });
      
      const transformedData = csvParser.transformForDashboard(parsedData, {
        numericFields: ['Time', 'Lat', 'Lon', 'Speed', 'Accel', 'Dist', 'AccX', 'AccY', 'AccZ']
      });
      
      // Convert speed from m/s to km/h
      const dataWithKmh = convertSpeedToKmh(transformedData);
      
      return NextResponse.json({
        camelId,
        race: {
          blobName: specificRace.name,
          lastModified: specificRace.lastModified,
          data: dataWithKmh,
          totalRecords: dataWithKmh.length
        }
      });
    }
    
    console.log(`📥 Fetching ${camelRaces.length} races for camel ${camelId}`);
    
    const racesData = await Promise.all(
      camelRaces.map(async (blob) => {
        const csvContent = await azureService.downloadBlob(blob.name);
        const parsedData = await csvParser.parseFromString(csvContent, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          delimiter: '',
          delimitersToGuess: [',', ';', '\t', '|']
        });
        
        const transformedData = csvParser.transformForDashboard(parsedData, {
          numericFields: ['Time', 'Lat', 'Lon', 'Speed', 'Accel', 'Dist', 'AccX', 'AccY', 'AccZ']
        });
        
        // Convert speed from m/s to km/h
        const dataWithKmh = convertSpeedToKmh(transformedData);
        
        const match = blob.name.match(/race_(\d{8})_(\d{4})_([^.]+)\.csv/);
        const [, date, time] = match || [];
        
        return {
          blobName: blob.name,
          date,
          time,
          lastModified: blob.lastModified,
          data: dataWithKmh,
          totalRecords: dataWithKmh.length
        };
      })
    );
    
    racesData.sort((a, b) => {
      const dateA = `${a.date}_${a.time}`;
      const dateB = `${b.date}_${b.time}`;
      return dateB.localeCompare(dateA);
    });
    
    return NextResponse.json({
      camelId,
      races: racesData,
      totalRaces: racesData.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching camel race data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch camel race data', details: String(error) },
      { status: 500 }
    );
  }
}