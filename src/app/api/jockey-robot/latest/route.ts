// app/api/jockey-robot/latest/route.ts
import { NextResponse } from 'next/server';
import { AzureBlobService } from '@/lib/azure';
import { csvParser } from '@/lib/csvParser';

export async function GET() {
  try {
    const azureService = new AzureBlobService('trainingdata');
    const allBlobs = await azureService.listBlobs();
    
    // Filter for race CSV files WITHOUT camel ID pattern (these are jockey robot files)
    // Handle both formats: /race_YYYY-MM-DD_HHMM.csv and race_YYYYMMDD_HHMM.csv
    // Exclude files with camel IDs like: race_20250506_0734_6bd6973f.csv
    const jockeyRaceBlobs = allBlobs.filter(blob => {
      const name = blob.name;
      if (!name.endsWith('.csv')) return false;
      
      // Remove leading slash if present
      const cleanName = name.startsWith('/') ? name.substring(1) : name;
      
      if (!cleanName.startsWith('race_')) return false;
      
      // Match patterns:
      // race_YYYY-MM-DD_HHMM.csv (with dashes in date)
      // race_YYYYMMDD_HHMM.csv (without dashes)
      // But exclude: race_YYYYMMDD_HHMM_CAMELID.csv
      const withDashes = cleanName.match(/^race_\d{4}-\d{2}-\d{2}_\d{4}\.csv$/);
      const withoutDashes = cleanName.match(/^race_\d{8}_\d{4}\.csv$/);
      
      return withDashes !== null || withoutDashes !== null;
    });
    
    if (jockeyRaceBlobs.length === 0) {
      console.log('⚠️ No jockey robot race files found');
      console.log('📋 Looking for patterns:');
      console.log('   - /race_YYYY-MM-DD_HHMM.csv');
      console.log('   - race_YYYYMMDD_HHMM.csv');
      console.log('📋 Sample blobs:', allBlobs.map(b => b.name).slice(0, 10));
      
      return NextResponse.json({ 
        error: 'No jockey robot data found',
        hint: 'Looking for files matching pattern: race_YYYY-MM-DD_HHMM.csv or race_YYYYMMDD_HHMM.csv (without camel ID)',
        availableFiles: allBlobs.map(b => b.name).slice(0, 20)
      }, { status: 404 });
    }
    
    // Sort by name (which contains date/time) to get most recent
    jockeyRaceBlobs.sort((a, b) => b.name.localeCompare(a.name));
    
    // Get the most recent jockey race file
    const latestBlob = jockeyRaceBlobs[0];
    console.log(`📥 Fetching jockey robot data from: ${latestBlob.name}`);
    console.log(`📊 Total jockey robot files available: ${jockeyRaceBlobs.length}`);
    
    const csvContent = await azureService.downloadBlob(latestBlob.name);
    const parsedData = await csvParser.parseFromString(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      delimiter: '',
      delimitersToGuess: [',', ';', '\t', '|']
    });
    
    const transformedData = csvParser.transformForDashboard(parsedData, {
      numericFields: [
        'Latitude', 'Longitude', 'Speed(km/', 'Acceleratio', 
        'Altitude(m', 'Satellites', 'AccelX', 'AccelY', 'AccelZ',
        'GyroX', 'GyroY', 'GyroZ', 'Temp(C)', 'Distance(m)'
      ]
    });
    
    // Parse race info from filename (handle both formats)
    const cleanName = latestBlob.name.startsWith('/') 
      ? latestBlob.name.substring(1) 
      : latestBlob.name;
    
    // Try format with dashes: race_YYYY-MM-DD_HHMM.csv
    let match = cleanName.match(/race_(\d{4})-(\d{2})-(\d{2})_(\d{4})\.csv/);
    let date, time;
    
    if (match) {
      const [, year, month, day, timeStr] = match;
      date = `${year}${month}${day}`;
      time = timeStr;
    } else {
      // Try format without dashes: race_YYYYMMDD_HHMM.csv
      match = cleanName.match(/race_(\d{8})_(\d{4})\.csv/);
      if (match) {
        [, date, time] = match;
      }
    }
    
    return NextResponse.json({
      data: transformedData,
      metadata: {
        blobName: latestBlob.name,
        date,
        time,
        lastModified: latestBlob.lastModified?.toISOString(),
        totalRecords: transformedData.length,
        totalAvailableFiles: jockeyRaceBlobs.length,
        source: 'jockey-robot'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching jockey robot data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jockey robot data', details: String(error) },
      { status: 500 }
    );
  }
}