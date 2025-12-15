// app/selection/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Edit2, Check, X, Calendar, Loader2, AlertCircle, Upload, Menu, Home, BarChart3, Settings, Trophy, Zap, TrendingUp, Activity, LogOut } from 'lucide-react';

interface CamelTrackerData {
  Speed: number;
  [key: string]: any;
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

interface CamelStats {
  maxSpeed: number;
  totalRaces: number;
  evolution: number;
}

interface User {
  id: string;
  email: string;
  name: string | null;
}

const API_BASE_URL = '/api';

const CamelSelectionPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [camels, setCamels] = useState<CamelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [camelNames, setCamelNames] = useState<{[key: string]: string}>({});
  const [camelImages, setCamelImages] = useState<{[key: string]: string}>({});
  const [camelStats, setCamelStats] = useState<{[key: string]: CamelStats}>({});
  const [editingCamel, setEditingCamel] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedCamel, setSelectedCamel] = useState<string | null>(null);
  const [hoveredCamel, setHoveredCamel] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingStats, setLoadingStats] = useState<{[key: string]: boolean}>({});

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      
      if (!response.ok) {
        router.push('/auth/login?redirect=/selection');
        return;
      }

      const data = await response.json();
      setUser(data.user);
      setAuthLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/auth/login?redirect=/selection');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      const stored = localStorage.getItem('camelNames');
      if (stored) setCamelNames(JSON.parse(stored));
      
      const storedImages = localStorage.getItem('camelImages');
      if (storedImages) setCamelImages(JSON.parse(storedImages));
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchCamels();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (user) {
      camels.forEach(camel => {
        if (!camelStats[camel.id]) {
          fetchCamelStats(camel.id);
        }
      });
    }
  }, [camels, user]);

  const calculateEvolution = (races: RaceData[]): number => {
    if (races.length < 2) return 0;

    const sortedRaces = [...races].sort((a, b) => {
      const dateTimeA = `${a.date}_${a.time}`;
      const dateTimeB = `${b.date}_${b.time}`;
      return dateTimeA.localeCompare(dateTimeB);
    });

    const raceSpeeds = sortedRaces.map(race => {
      const speeds = race.data.map(point => point.Speed || 0).filter(s => s > 0);
      return speeds.length > 0 ? Math.max(...speeds) : 0;
    });

    const improvements: number[] = [];
    for (let i = 1; i < raceSpeeds.length; i++) {
      if (raceSpeeds[i - 1] > 0) {
        const improvement = ((raceSpeeds[i] - raceSpeeds[i - 1]) / raceSpeeds[i - 1]) * 100;
        improvements.push(improvement);
      }
    }

    if (improvements.length === 0) return 0;
    const avgImprovement = improvements.reduce((sum, val) => sum + val, 0) / improvements.length;
    
    return avgImprovement;
  };

  const fetchCamels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/camels/list`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login?redirect=/selection');
          return;
        }
        throw new Error('Failed to fetch camels');
      }
      const result = await response.json();
      setCamels(result.camels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCamelStats = async (camelId: string) => {
    if (loadingStats[camelId]) return;
    
    setLoadingStats(prev => ({ ...prev, [camelId]: true }));
    
    try {
      const response = await fetch(`${API_BASE_URL}/camels/${camelId}`);
      if (!response.ok) throw new Error('Failed to fetch camel data');
      const result: { races: RaceData[] } = await response.json();
      
      let maxSpeed = 0;
      
      result.races.forEach(race => {
        race.data.forEach(point => {
          const speed = point.Speed || 0;
          if (speed > 0) {
            maxSpeed = Math.max(maxSpeed, speed);
          }
        });
      });

      const evolution = calculateEvolution(result.races);
      
      setCamelStats(prev => ({
        ...prev,
        [camelId]: {
          maxSpeed,
          totalRaces: result.races.length,
          evolution
        }
      }));
    } catch (err) {
      console.error(`Error fetching stats for camel ${camelId}:`, err);
    } finally {
      setLoadingStats(prev => ({ ...prev, [camelId]: false }));
    }
  };

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

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr || timeStr.length !== 4) return timeStr;
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
  };

  const handleRaceSelect = (camelId: string, race: any) => {
    localStorage.setItem('selectedCamel', camelId);
    localStorage.setItem('selectedRace', race.blobName);
    window.location.href = '/dashboard';
  };

  const getCircleColor = (index: number) => {
    const colors = [
      'bg-gradient-to-br from-amber-400 to-orange-600',
      'bg-gradient-to-br from-rose-400 to-pink-600',
      'bg-gradient-to-br from-emerald-400 to-teal-600',
      'bg-gradient-to-br from-violet-400 to-purple-600',
      'bg-gradient-to-br from-cyan-400 to-blue-600',
      'bg-gradient-to-br from-fuchsia-400 to-purple-600',
      'bg-gradient-to-br from-lime-400 to-green-600',
      'bg-gradient-to-br from-sky-400 to-indigo-600',
    ];
    return colors[index % colors.length];
  };

  const getEvolutionColor = (evolution: number) => {
    if (evolution > 5) return 'text-green-600';
    if (evolution > 0) return 'text-blue-600';
    if (evolution > -5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getEvolutionIcon = (evolution: number) => {
    if (evolution > 0) return '↑';
    if (evolution < 0) return '↓';
    return '→';
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-gray-700 text-xl font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, middleware will redirect
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-gray-700 text-xl font-medium">Loading camels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md border border-amber-200">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Error</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={fetchCamels}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-4 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all font-semibold shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 bg-amber-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-400 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-rose-400 rounded-full blur-3xl"></div>
      </div>

      <header className="relative z-20 bg-white/80 backdrop-blur-lg border-b border-amber-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-2xl shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                  Camel Racing Pro
                </h1>
                <p className="text-sm text-gray-600">Welcome, {user.name || user.email}</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-amber-50 rounded-xl transition-colors font-medium">
                <Home className="w-4 h-4" />
                Home
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-amber-50 rounded-xl transition-colors font-medium">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-amber-50 rounded-xl transition-colors font-medium">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 ml-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </nav>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 hover:bg-amber-50 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-amber-200 shadow-lg">
            <nav className="px-6 py-4 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-amber-50 rounded-xl transition-colors font-medium">
                <Home className="w-5 h-5" />
                Home
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-amber-50 rounded-xl transition-colors font-medium">
                <BarChart3 className="w-5 h-5" />
                Analytics
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-amber-50 rounded-xl transition-colors font-medium">
                <Settings className="w-5 h-5" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-amber-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">{camels.length} Active Camels</span>
            </div>
          </div>
          <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-amber-700 via-orange-700 to-rose-700 bg-clip-text text-transparent">
            Select Your Camel
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto mb-6">
            Track performance evolution and compare camels across races
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow border border-amber-100">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span className="font-semibold">{camels.reduce((sum, c) => sum + c.totalRaces, 0)} Total Races</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow border border-amber-100">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="font-semibold">Evolution Tracking</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 max-w-6xl ml-auto mr-28">
            {camels.map((camel, index) => {
              const stats = camelStats[camel.id];
              
              return (
                <div
                  key={camel.id}
                  className="flex flex-col items-center"
                  onMouseEnter={() => setHoveredCamel(camel.id)}
                  onMouseLeave={() => setHoveredCamel(null)}
                >
                  <div
                    onClick={() => setSelectedCamel(selectedCamel === camel.id ? null : camel.id)}
                    className={`relative w-40 h-40 rounded-full cursor-pointer transition-all duration-300 ${
                      getCircleColor(index)
                    } ${
                      selectedCamel === camel.id
                        ? 'ring-4 ring-amber-500 scale-110 shadow-2xl'
                        : hoveredCamel === camel.id
                        ? 'scale-105 shadow-2xl'
                        : 'shadow-xl hover:shadow-2xl'
                    }`}
                  >
                    {camelImages[camel.id] ? (
                      <img
                        src={camelImages[camel.id]}
                        alt="Camel"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                        {getCamelDisplayName(camel.id).charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <label className="absolute -bottom-2 -right-2 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-xl cursor-pointer hover:bg-amber-50 transition-all border-4 border-white hover:scale-110">
                      <Upload className="w-4 h-4 text-amber-600" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => saveCamelImage(camel.id, reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="mt-4 text-center w-full">
                    {editingCamel === camel.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border-2 border-amber-300 rounded-lg px-3 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveCamelName(camel.id, editName);
                              setEditingCamel(null);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            saveCamelName(camel.id, editName);
                            setEditingCamel(null);
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCamel(null)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-center">
                        <span className="font-bold text-gray-900 text-lg">
                          {getCamelDisplayName(camel.id)}
                        </span>
                        <button
                          onClick={() => {
                            setEditingCamel(camel.id);
                            setEditName(getCamelDisplayName(camel.id));
                          }}
                          className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-amber-600" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 w-full space-y-2">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow border border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-medium text-gray-600">Races</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{camel.totalRaces}</span>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow border border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-600">Max Speed</span>
                      </div>
                      {loadingStats[camel.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <span className="text-sm font-bold text-gray-900">
                          {stats ? `${stats.maxSpeed.toFixed(1)} km/h` : '-'}
                        </span>
                      )}
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow border border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-medium text-gray-600">Evolution</span>
                      </div>
                      {loadingStats[camel.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <span className={`text-sm font-bold ${stats ? getEvolutionColor(stats.evolution) : 'text-gray-900'}`}>
                          {stats ? (
                            <>
                              {getEvolutionIcon(stats.evolution)} {Math.abs(stats.evolution).toFixed(1)}%
                            </>
                          ) : '-'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedCamel && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-2 border-amber-200 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-2xl shadow-lg">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900">
                    {getCamelDisplayName(selectedCamel)}
                  </h3>
                  <p className="text-gray-600 mt-1">Select a race to view detailed analytics</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCamel(null)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[500px] overflow-y-auto pr-2">
              {camels
                .find(c => c.id === selectedCamel)
                ?.races.map((race, index) => (
                  <button
                    key={race.blobName}
                    onClick={() => handleRaceSelect(selectedCamel, race)}
                    className="bg-gradient-to-br from-white to-amber-50 hover:from-amber-50 hover:to-orange-50 rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-xl border-2 border-amber-200 hover:border-amber-400 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-2 rounded-xl shadow">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-gray-900 text-lg">Race #{index + 1}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="space-y-3 ml-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 font-medium">Date:</span>
                        <span className="font-bold text-gray-900">{formatDate(race.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 font-medium">Time:</span>
                        <span className="font-bold text-gray-900">{formatTime(race.time)}</span>
                      </div>
                      {race.lastModified && (
                        <div className="text-xs text-gray-500 pt-2 border-t border-amber-100">
                          Modified: {new Date(race.lastModified).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {camels.length === 0 && (
          <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-amber-200">
            <AlertCircle className="w-20 h-20 text-amber-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No Camels Found</h3>
            <p className="text-gray-600 text-lg">No race data available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CamelSelectionPage;