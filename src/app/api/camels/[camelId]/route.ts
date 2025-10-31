// app/api/camels/[camelId]/route.ts
import { NextResponse } from 'next/server';
import { AzureBlobService } from '@/lib/azure';
import { csvParser } from '@/lib/csvParser';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ camelId: string }> }
) {
  try {
    // Await params in Next.js 15
    const { camelId } = await params;
    const { searchParams } = new URL(request.url);
    const raceBlob = searchParams.get('race'); // Optional: specific race
    
    const azureService = new AzureBlobService('trainingdata');
    const allBlobs = await azureService.listBlobs();
    
    // Find all races for this camel
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
    
    // If specific race requested, fetch only that one
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
      
      return NextResponse.json({
        camelId,
        race: {
          blobName: specificRace.name,
          lastModified: specificRace.lastModified,
          data: transformedData,
          totalRecords: transformedData.length
        }
      });
    }
    
    // Fetch all races for this camel
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
        
        // Parse race info from filename
        const match = blob.name.match(/race_(\d{8})_(\d{4})_([^.]+)\.csv/);
        const [, date, time] = match || [];
        
        return {
          blobName: blob.name,
          date,
          time,
          lastModified: blob.lastModified,
          data: transformedData,
          totalRecords: transformedData.length
        };
      })
    );
    
    // Sort by date/time (most recent first)
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