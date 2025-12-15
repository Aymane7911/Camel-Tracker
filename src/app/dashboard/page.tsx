'use client'

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Activity, Satellite, MapPin, Thermometer, Gauge, AlertCircle, Loader2, ChevronDown, ChevronRight, Calendar, TrendingUp, Edit2, Check, X, Image as ImageIcon, Menu, LogOut, BarChart3, Home, X as CloseIcon, Zap, Award, Timer, Sparkles } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { AIChatPanel } from '@/components/AIChatPanel';

interface CamelTrackerData {
  Time: number;
  Lat: number;
  Lon: number;
  Speed: number;
  Accel: number;
  Dist: number;
  AccX: number;
  AccY: number;
  AccZ: number;
}

interface RaceData {
  blobName: string;
  date: string;
  time: string;
  lastModified?: string;
  data: CamelTrackerData[];
  totalRecords: number;
}

interface CamelInfo {
  id: string;
  races: Array<{
    blobName: string;
    date: string;
    time: string;
    lastModified?: string;
  }>;
  totalRaces: number;
}

interface JockeyRobotData {
  Date: string;
  Time: string;
  Latitude: number;
  Longitude: number;
  'Speed(km/': number;
  Acceleratio: number;
  'Altitude(m': number;
  Satellites: number;
  AccelX: number;
  AccelY: number;
  AccelZ: number;
  GyroX: number;
  GyroY: number;
  GyroZ: number;
  'Temp(C)': number;
  'Distance(m)': number;
}

const API_BASE_URL = '/api';

const Dashboard = () => {
  const [camels, setCamels] = useState<CamelInfo[]>([]);
  const [selectedCamel, setSelectedCamel] = useState<string | null>(null);
  const [selectedRace, setSelectedRace] = useState<string | null>(null);
  const [camelRaces, setCamelRaces] = useState<RaceData[]>([]);
  const [currentRaceData, setCurrentRaceData] = useState<CamelTrackerData[]>([]);
  const [jockeyData, setJockeyData] = useState<JockeyRobotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'camels' | 'jockey'>('dashboard');
  const [expandedCamel, setExpandedCamel] = useState<string | null>(null);
  const [camelNames, setCamelNames] = useState<{[key: string]: string}>({});
  const [editingCamel, setEditingCamel] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [camelImages, setCamelImages] = useState<{[key: string]: string}>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  useEffect(() => {
    // Load Leaflet CSS on client side only
    if (typeof window !== 'undefined') {
      require('leaflet/dist/leaflet.css');
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('camelNames');
    if (stored) setCamelNames(JSON.parse(stored));
    
    const storedImages = localStorage.getItem('camelImages');
    if (storedImages) setCamelImages(JSON.parse(storedImages));
  }, []);

  const saveCamelName = (camelId: string, name: string) => {
    const updated = { ...camelNames, [camelId]: name };
    setCamelNames(updated);
    localStorage.setItem('camelNames', JSON.stringify(updated));
  };

  const saveCamelImage = (camelId: string, imageUrl: string) => {
    const updated = { ...camelImages, [camelId]: imageUrl };
    setCamelImages(updated);
    localStorage.setItem('camelImages', JSON.stringify(updated));
  };

  const getCamelDisplayName = (camelId: string) => {
    return camelNames[camelId] || camelId.substring(0, 12);
  };

  const fetchCamels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/camels/list`);
      if (!response.ok) throw new Error('Failed to fetch camels');
      const result = await response.json();
      setCamels(result.camels);
      
      if (!selectedCamel && result.camels.length > 0) {
        setSelectedCamel(result.camels[0].id);
      }
    } catch (err) {
      console.error('Error fetching camels:', err);
      throw err;
    }
  };

  const fetchCamelRaces = async (camelId: string) => {
  try {
    console.log('🔍 [FETCH] Starting to fetch races for camel:', camelId);
    const response = await fetch(`${API_BASE_URL}/camels/${camelId}`);
    
    if (!response.ok) {
      console.error('❌ [FETCH] Response not OK:', response.status);
      throw new Error('Failed to fetch camel races');
    }
    
    const result = await response.json();
    console.log('✅ [FETCH] Successfully fetched races:', result.races.length);
    
    setCamelRaces(result.races);
    
    if (result.races.length > 0) {
      const firstRace = result.races[0];
      console.log('📊 [DATA] First race total data points:', firstRace.data.length);
      console.log('📊 [DATA] First 5 data points:', firstRace.data.slice(0, 5));
      console.log('📊 [DATA] Last 5 data points:', firstRace.data.slice(-5));
      
      // Check speed range
      const speeds = firstRace.data.map(d => d.Speed || 0);
      const minSpeed = Math.min(...speeds);
      const maxSpeed = Math.max(...speeds);
      console.log('🏃 [SPEED] Speed range:', minSpeed, 'to', maxSpeed, 'km/h');
      
      // Count data points by speed threshold
      const below3 = speeds.filter(s => s < 3).length;
      const above3 = speeds.filter(s => s >= 3).length;
      console.log('📈 [SPEED] Points below 3 km/h:', below3);
      console.log('📈 [SPEED] Points at/above 3 km/h:', above3);
      
      setSelectedRace(firstRace.blobName);
      setCurrentRaceData(firstRace.data);
      console.log('✅ [STATE] Current race data set with', firstRace.data.length, 'points');
    }
  } catch (err) {
    console.error('❌ [FETCH] Error fetching camel races:', err);
    throw err;
  }
};

  const fetchJockeyData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jockey-robot/latest`);
      if (!response.ok) {
        if (response.status === 404) {
          setJockeyData([]);
          return;
        }
        throw new Error('Failed to fetch jockey data');
      }
      const result = await response.json();
      setJockeyData(result.data);
    } catch (err) {
      console.error('Error fetching jockey data:', err);
      setJockeyData([]);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchCamels();
      await fetchJockeyData();
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedCamel) {
      fetchCamelRaces(selectedCamel);
    }
  }, [selectedCamel]);

  useEffect(() => {
   if (currentRaceData.length > 0 && mapRef.current && typeof window !== 'undefined' && activeTab === 'camels') {
  console.log('🗺️ [MAP] Rendering map with', currentRaceData.length, 'data points');
  
  // Dynamically load Leaflet
  const L = require('leaflet');
      
      // Remove existing map instance safely
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        mapInstanceRef.current = null;
      }

      // Wait for the DOM to be fully ready
      const initMap = () => {
        if (!mapRef.current) return;

        const mapData = currentRaceData; // Use ALL data
  console.log('🗺️ [MAP] Using', mapData.length, 'points for map visualization');
  
  if (mapData.length === 0) {
    console.warn('⚠️ [MAP] No map data available');
    return;
  }

        try {
          // Clear the container
          mapRef.current.innerHTML = '';
          
          // Create new map
          const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true
          }).setView([mapData[0].Lat, mapData[0].Lon], 15);
          
          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          // Create polyline from filtered points
          const points: any[] = mapData.map(d => [d.Lat, d.Lon]);
          const polyline = L.polyline(points, { color: 'blue', weight: 3 }).addTo(map);
          
          // Add markers for start and finish only to reduce clutter
          const startMarker = L.circleMarker([mapData[0].Lat, mapData[0].Lon], {
            radius: 8,
            fillColor: 'green',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map).bindPopup(`
            <b>Start</b><br>
            Speed: ${mapData[0].Speed?.toFixed(2)} km/h<br>
            Distance: ${mapData[0].Dist?.toFixed(2)} m
          `);

          const endIdx = mapData.length - 1;
          const endMarker = L.circleMarker([mapData[endIdx].Lat, mapData[endIdx].Lon], {
            radius: 8,
            fillColor: 'red',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map).bindPopup(`
            <b>Finish</b><br>
            Speed: ${mapData[endIdx].Speed?.toFixed(2)} km/h<br>
            Distance: ${mapData[endIdx].Dist?.toFixed(2)} m
          `);

          // Fit map to show all points with padding
          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
          mapInstanceRef.current = map;
          
          // Force map to invalidate size after delays
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 100);
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 300);
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      };

      // Initialize map with a slight delay
      const timeoutId = setTimeout(initMap, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error cleaning up map:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [currentRaceData, activeTab]);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr || timeStr.length !== 4) return timeStr;
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
  };

  const getFilteredRaceData = (data: CamelTrackerData[]) => {
  // Return complete unfiltered data
  console.log('Total data points:', data.length); // Debug log
  return data;
};

  const getLatestMetrics = (data: CamelTrackerData[]) => {
  console.log('📊 [METRICS] Calculating metrics from', data.length, 'data points');
  
  if (data.length === 0) {
    console.warn('⚠️ [METRICS] No data available for metrics');
    return null;
  }
  
  // Use ALL data without filtering
  const latest = data[data.length - 1];
  
  const speeds = data.map(d => d.Speed || 0);
  const maxSpeed = Math.max(...speeds);
  const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
  
  console.log('📊 [METRICS] Calculated:', {
    totalPoints: data.length,
    maxSpeed: maxSpeed.toFixed(2),
    avgSpeed: avgSpeed.toFixed(2),
    latestSpeed: (latest.Speed || 0).toFixed(2)
  });
  
  return {
    speed: latest.Speed?.toFixed(2) || '0',
    acceleration: latest.Accel?.toFixed(2) || '0',
    distance: latest.Dist?.toFixed(2) || '0',
    position: `${latest.Lat?.toFixed(5)}, ${latest.Lon?.toFixed(5)}`,
    gForce: Math.sqrt(
      Math.pow(latest.AccX || 0, 2) + 
      Math.pow(latest.AccY || 0, 2) + 
      Math.pow(latest.AccZ || 0, 2)
    ).toFixed(2),
    maxSpeed: maxSpeed.toFixed(2),
    avgSpeed: avgSpeed.toFixed(2),
    totalDistance: Math.max(...data.map(d => d.Dist || 0)).toFixed(2)
  };
};



  const getChartData = () => {
  console.log('📈 [CHART] Getting chart data from currentRaceData:', currentRaceData.length, 'points');
  
  // Use ALL data without filtering
  const data = currentRaceData;
  
  if (data.length === 0) {
    console.warn('⚠️ [CHART] No data available for charts');
    return [];
  }
  
  // Log speed statistics
  const speeds = data.map(d => d.Speed || 0);
  console.log('📊 [CHART] Speed stats:', {
    min: Math.min(...speeds).toFixed(2),
    max: Math.max(...speeds).toFixed(2),
    avg: (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(2)
  });
  
  // Apply moving average smoothing to acceleration data
  const smoothAcceleration = (dataArray: any[], windowSize: number = 20) => {
    return dataArray.map((item, idx) => {
      const start = Math.max(0, idx - Math.floor(windowSize / 2));
      const end = Math.min(dataArray.length, idx + Math.floor(windowSize / 2) + 1);
      const window = dataArray.slice(start, end);
      const avg = window.reduce((sum, d) => sum + (d.Accel || 0), 0) / window.length;
      return avg;
    });
  };
  
  const smoothedAccel = smoothAcceleration(data);
  
  const chartData = data.map((d, idx) => ({
    index: idx,
    speed: d.Speed || 0,
    acceleration: smoothedAccel[idx],
    distance: d.Dist || 0
  }));
  
  console.log('✅ [CHART] Chart data prepared with', chartData.length, 'points');
  console.log('📊 [CHART] First 3 chart points:', chartData.slice(0, 3));
  
  return chartData;
};


  const getJockeyMetrics = () => {
    if (jockeyData.length === 0) return null;
    const latest = jockeyData[jockeyData.length - 1];
    return {
      speed: latest['Speed(km/']?.toFixed(2) || '0',
      altitude: latest['Altitude(m']?.toFixed(2) || '0',
      satellites: latest.Satellites || 0,
      temperature: latest['Temp(C)']?.toFixed(1) || '0',
      position: `${latest.Latitude?.toFixed(5)}, ${latest.Longitude?.toFixed(5)}`,
      distance: latest['Distance(m)']?.toFixed(2) || '0',
      gyroMagnitude: Math.sqrt(
        Math.pow(latest.GyroX || 0, 2) + 
        Math.pow(latest.GyroY || 0, 2) + 
        Math.pow(latest.GyroZ || 0, 2)
      ).toFixed(2)
    };
  };

  const handleLogout = () => {
    alert('Logout functionality - would redirect to login page');
  };

  const MetricCard = ({ icon: Icon, label, value, unit, gradient, trend }: any) => (
    <div className={`relative overflow-hidden rounded-2xl shadow-lg p-6 ${gradient} text-white transform hover:scale-105 transition-transform duration-200`}>
      <div className="absolute top-0 right-0 opacity-10">
        <Icon className="w-32 h-32 transform translate-x-8 -translate-y-8" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <Icon className="w-7 h-7" />
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              <TrendingUp className="w-4 h-4" />
              {trend}%
            </div>
          )}
        </div>
        <div className="text-4xl font-bold mb-1">{value}</div>
        <div className="text-sm opacity-90 font-medium">{label} {unit && <span className="text-xs opacity-75">({unit})</span>}</div>
      </div>
    </div>
  );

  const StatsCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-xl ${color}`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600 font-medium">{label}</p>
        </div>
      </div>
    </div>
  );

  if (loading && camels.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <Loader2 className="w-24 h-24 animate-spin text-blue-600" />
            <Activity className="w-12 h-12 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-600" />
          </div>
          <p className="text-gray-700 text-xl font-bold mb-2">Loading Racing Analytics</p>
          <p className="text-gray-500">Fetching real-time data...</p>
        </div>
      </div>
    );
  }

  const metrics = getLatestMetrics(currentRaceData);
  const jockeyMetrics = getJockeyMetrics();
  const chartData = getChartData();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 overflow-hidden">
      {/* Enhanced Sidebar */}
      <aside className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white transition-all duration-300 overflow-hidden shadow-2xl relative`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative z-10 p-6 h-full flex flex-col">
          {/* Logo Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Activity className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-xl">Racing Hub</h2>
                <p className="text-xs text-blue-200">Professional Analytics</p>
              </div>
            </div>
            {lastUpdate && (
              <div className="text-xs text-blue-200 mt-3 bg-white/10 rounded-lg px-3 py-2">
                Last sync: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-2 mb-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50 scale-105'
                  : 'hover:bg-white/10'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
              {activeTab === 'dashboard' && <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse"></div>}
            </button>

            <button
              onClick={() => setActiveTab('camels')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${
                activeTab === 'camels'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50 scale-105'
                  : 'hover:bg-white/10'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Camel Races</span>
              <div className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">{camels.length}</div>
            </button>
          </nav>

          {/* Camels List */}
          <div className="flex-1 overflow-hidden">
            <h3 className="text-sm font-bold text-blue-200 mb-3 px-2 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Active Camels ({camels.length})
            </h3>
            <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {camels.map((camel) => (
                <button
                  key={camel.id}
                  onClick={() => {
                    setSelectedCamel(camel.id);
                    setActiveTab('camels');
                  }}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedCamel === camel.id
                      ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-2 border-blue-400 shadow-lg'
                      : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {camelImages[camel.id] ? (
                      <img src={camelImages[camel.id]} alt="Camel" className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30" />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-white/30">
                        {getCamelDisplayName(camel.id).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{getCamelDisplayName(camel.id)}</div>
                      <div className="flex items-center gap-2 text-xs text-blue-200">
                        <Timer className="w-3 h-3" />
                        {camel.totalRaces} races
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 transition-all border-2 border-red-400/50 mt-4"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Enhanced Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-gray-200">
          <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {sidebarOpen ? <CloseIcon className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Racing Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Real-time monitoring and performance insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* AI Assistant Button */}
              <button
                onClick={() => setAiChatOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                <Sparkles className="w-5 h-5" />
                AI Assistant
              </button>
              
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>
          {error && (
            <div className="mx-8 mb-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 flex items-center gap-3 text-red-700 shadow-sm">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
        </header>

        {/* Content Area */}
        <main className="p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Hero Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard 
                  icon={Activity} 
                  label="Total Camels" 
                  value={camels.length}
                  color="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <StatsCard 
                  icon={BarChart3} 
                  label="Total Races" 
                  value={camels.reduce((sum, c) => sum + c.totalRaces, 0)}
                  color="bg-gradient-to-br from-purple-500 to-purple-600"
                />
                <StatsCard 
                  icon={TrendingUp} 
                  label="Active Sessions" 
                  value={selectedCamel ? camelRaces.length : 0}
                  color="bg-gradient-to-br from-green-500 to-green-600"
                />
              </div>

              {/* Overview Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Award className="w-6 h-6 text-blue-600" />
                    Top Performers
                  </h3>
                  <div className="space-y-3">
                    {camels.slice(0, 5).map((camel, idx) => (
                      <div key={camel.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:shadow-md transition-shadow">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-blue-500'
                        }`}>
                          #{idx + 1}
                        </div>
                        {camelImages[camel.id] ? (
                          <img src={camelImages[camel.id]} alt="Camel" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center font-bold text-white">
                            {getCamelDisplayName(camel.id).charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{getCamelDisplayName(camel.id)}</p>
                          <p className="text-sm text-gray-600">{camel.totalRaces} races completed</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCamel(camel.id);
                            setActiveTab('camels');
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                    System Overview
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-blue-600" />
                        <span className="font-medium text-gray-700">Active Trackers</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{camels.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Timer className="w-6 h-6 text-green-600" />
                        <span className="font-medium text-gray-700">Total Sessions</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600">{camels.reduce((sum, c) => sum + c.totalRaces, 0)}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Award className="w-6 h-6 text-purple-600" />
                        <span className="font-medium text-gray-700">Avg Races/Camel</span>
                      </div>
                      <span className="text-2xl font-bold text-purple-600">
                        {camels.length > 0 ? (camels.reduce((sum, c) => sum + c.totalRaces, 0) / camels.length).toFixed(1) : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats if race is selected */}
              {metrics && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-7 h-7 text-blue-600" />
                    Latest Race Performance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard 
                      icon={Zap} 
                      label="Max Speed" 
                      value={metrics.maxSpeed} 
                      unit="km/h" 
                      gradient="bg-gradient-to-br from-green-500 to-emerald-600"
                      trend="+12"
                    />
                    <MetricCard 
                      icon={Activity} 
                      label="Avg Speed" 
                      value={metrics.avgSpeed} 
                      unit="km/h" 
                      gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                      trend="+8"
                    />
                    <MetricCard 
                      icon={MapPin} 
                      label="Distance" 
                      value={metrics.totalDistance} 
                      unit="m" 
                      gradient="bg-gradient-to-br from-orange-500 to-red-600"
                    />
                    <MetricCard 
                      icon={Gauge} 
                      label="G-Force" 
                      value={metrics.gForce} 
                      unit="g" 
                      gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'camels' && (
            <div className="space-y-6">
              {metrics ? (
                <>
                  {/* Camel Header */}
                  <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        {selectedCamel && camelImages[selectedCamel] ? (
                          <img src={camelImages[selectedCamel]} alt="Camel" className="w-20 h-20 rounded-full object-cover ring-4 ring-white/50 shadow-lg" />
                        ) : (
                          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold ring-4 ring-white/50">
                            {selectedCamel && getCamelDisplayName(selectedCamel).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                            {selectedCamel && getCamelDisplayName(selectedCamel)}
                            <button
                              onClick={() => {
                                setEditingCamel(selectedCamel);
                                setEditName(selectedCamel ? getCamelDisplayName(selectedCamel) : '');
                              }}
                              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                          </h2>
                          {selectedRace && camelRaces.find(r => r.blobName === selectedRace) && (
                            <p className="text-white/90 flex items-center gap-2 text-lg">
                              <Calendar className="w-5 h-5" />
                              {formatDate(camelRaces.find(r => r.blobName === selectedRace)!.date)} {' '}
                              {formatTime(camelRaces.find(r => r.blobName === selectedRace)!.time)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-5xl font-bold mb-1">{camelRaces.length}</div>
                        <div className="text-lg text-white/80">Total Races</div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard 
                      icon={Zap} 
                      label="Max Speed" 
                      value={metrics.maxSpeed} 
                      unit="km/h" 
                      gradient="bg-gradient-to-br from-green-500 to-emerald-600"
                      trend="+12"
                    />
                    <MetricCard 
                      icon={Activity} 
                      label="Avg Speed" 
                      value={metrics.avgSpeed} 
                      unit="km/h" 
                      gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                      trend="+8"
                    />
                    <MetricCard 
                      icon={MapPin} 
                      label="Distance" 
                      value={metrics.totalDistance} 
                      unit="m" 
                      gradient="bg-gradient-to-br from-orange-500 to-red-600"
                    />
                    <MetricCard 
                      icon={Gauge} 
                      label="Acceleration" 
                      value={metrics.acceleration} 
                      unit="m/s²" 
                      gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    />
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                        Speed Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="index" stroke="#6b7280" style={{ fontSize: '12px' }} />
                          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Area type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSpeed)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-purple-600" />
                        Acceleration & Distance
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="index" stroke="#6b7280" style={{ fontSize: '12px' }} />
                          <YAxis 
                            yAxisId="left" 
                            stroke="#8b5cf6" 
                            style={{ fontSize: '12px' }}
                            domain={['auto', 'auto']}
                            label={{ value: 'Acceleration (m/s²)', angle: -90, position: 'insideLeft', style: { fill: '#8b5cf6' } }}
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            stroke="#f59e0b" 
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Distance (m)', angle: 90, position: 'insideRight', style: { fill: '#f59e0b' } }}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Line 
                            yAxisId="left" 
                            type="monotone" 
                            dataKey="acceleration" 
                            stroke="#8b5cf6" 
                            strokeWidth={2} 
                            dot={false}
                            name="Acceleration (m/s²)"
                          />
                          <Line 
                            yAxisId="right" 
                            type="monotone" 
                            dataKey="distance" 
                            stroke="#f59e0b" 
                            strokeWidth={2} 
                            dot={false}
                            name="Distance (m)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Map */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <MapPin className="w-6 h-6 text-blue-600" />
                      Race Track Visualization
                    </h3>
                    <div ref={mapRef} className="w-full h-96 rounded-xl"></div>
                    <div className="mt-4 flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-gray-600 font-medium">Start</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600 font-medium">Track Points</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-gray-600 font-medium">Finish</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-blue-600" />
                        GPS Coordinates
                      </h3>
                      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl">
                        <p className="text-gray-700 font-mono text-sm">{metrics.position}</p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border border-purple-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-purple-600" />
                        Performance Stats
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/80 backdrop-blur-sm rounded-xl">
                          <span className="text-gray-700 font-medium">G-Force:</span>
                          <span className="font-bold text-gray-900 text-lg">{metrics.gForce} g</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/80 backdrop-blur-sm rounded-xl">
                          <span className="text-gray-700 font-medium">Current Speed:</span>
                          <span className="font-bold text-gray-900 text-lg">{metrics.speed} km/h</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Race History */}
                  {camelRaces.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-blue-600" />
                        Race History
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {camelRaces.map((race) => (
                          <button
                            key={race.blobName}
                            onClick={() => {
                              setSelectedRace(race.blobName);
                              setCurrentRaceData(race.data);
                            }}
                            className={`p-5 rounded-xl border-2 transition-all text-left ${
                              selectedRace === race.blobName
                                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg scale-105'
                                : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Calendar className="w-5 h-5 text-blue-600" />
                              <span className="font-bold text-gray-900">
                                {formatDate(race.date)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              Time: {formatTime(race.time)}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                              <span className="text-xs text-gray-500">Data Points</span>
                              <span className="text-sm font-bold text-blue-600">{race.totalRecords}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 border-2 border-yellow-300 rounded-2xl p-12 text-center shadow-lg">
                  <AlertCircle className="w-20 h-20 text-yellow-600 mx-auto mb-4" />
                  <p className="text-yellow-900 font-bold text-2xl mb-2">No Race Data Selected</p>
                  <p className="text-yellow-700 text-lg">Please select a camel from the sidebar to view detailed race analytics</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'jockey' && (
            <div className="space-y-6">
              {jockeyMetrics ? (
                <>
                  <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                          <Satellite className="w-8 h-8" />
                          Jockey Robot Monitor
                        </h2>
                        <p className="text-white/90 text-lg">Real-time telemetry and sensor data</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-lg font-semibold">Live</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard 
                      icon={Gauge} 
                      label="Speed" 
                      value={jockeyMetrics.speed} 
                      unit="km/h" 
                      gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                    />
                    <MetricCard 
                      icon={MapPin} 
                      label="Altitude" 
                      value={jockeyMetrics.altitude} 
                      unit="m" 
                      gradient="bg-gradient-to-br from-green-500 to-green-600"
                    />
                    <MetricCard 
                      icon={Satellite} 
                      label="Satellites" 
                      value={jockeyMetrics.satellites} 
                      unit="" 
                      gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                    />
                    <MetricCard 
                      icon={Thermometer} 
                      label="Temperature" 
                      value={jockeyMetrics.temperature} 
                      unit="°C" 
                      gradient="bg-gradient-to-br from-red-500 to-red-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-blue-600" />
                        GPS Position
                      </h3>
                      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl">
                        <p className="text-gray-700 font-mono text-sm">{jockeyMetrics.position}</p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border border-purple-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-purple-600" />
                        Gyroscope
                      </h3>
                      <p className="text-4xl font-bold text-gray-900">{jockeyMetrics.gyroMagnitude}°/s</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-green-600" />
                        Distance
                      </h3>
                      <p className="text-4xl font-bold text-gray-900">{jockeyMetrics.distance}m</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                      Recent Telemetry Data ({jockeyData.length} records)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                            <th className="px-4 py-3 text-left font-bold text-gray-700 rounded-tl-lg">Time</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700">Latitude</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700">Longitude</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700">Speed</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700">Altitude</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700">Satellites</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-700 rounded-tr-lg">Temp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jockeyData.slice(-10).reverse().map((row, idx) => (
                            <tr key={idx} className="border-t border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-colors">
                              <td className="px-4 py-3 font-mono text-gray-900 font-semibold">{row.Time}</td>
                              <td className="px-4 py-3 font-mono text-gray-700">{row.Latitude?.toFixed(5)}</td>
                              <td className="px-4 py-3 font-mono text-gray-700">{row.Longitude?.toFixed(5)}</td>
                              <td className="px-4 py-3 text-gray-900 font-semibold">{row['Speed(km/']?.toFixed(2)} km/h</td>
                              <td className="px-4 py-3 text-gray-900">{row['Altitude(m']?.toFixed(2)} m</td>
                              <td className="px-4 py-3 text-gray-900">{row.Satellites}</td>
                              <td className="px-4 py-3 text-gray-900">{row['Temp(C)']?.toFixed(1)}°C</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 border-2 border-yellow-300 rounded-2xl p-12 text-center shadow-lg">
                  <AlertCircle className="w-20 h-20 text-yellow-600 mx-auto mb-4" />
                  <p className="text-yellow-900 font-bold text-2xl mb-2">No Jockey Robot Data Available</p>
                  <p className="text-yellow-700 text-lg">System is in standby mode. Try refreshing or check back later</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden z-20"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      <AIChatPanel isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
    </div>
  );
};

export default Dashboard;