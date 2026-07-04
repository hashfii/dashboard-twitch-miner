"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Play, Square, Activity, Terminal, Plus, LogOut, RefreshCw, Trash2, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = "/api";

type Bot = {
  name: string;
  status: "Running" | "Stopped";
  session: string;
};

export default function Dashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteBotName, setDeleteBotName] = useState<string | null>(null);
  const [addBotError, setAddBotError] = useState<string | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [analyticsFilter, setAnalyticsFilter] = useState<string>("All");
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsStreamers, setSettingsStreamers] = useState("");
  const [settingsWebhook, setSettingsWebhook] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBot) {
      fetchLogs(selectedBot);
      fetchAnalytics(selectedBot);
      const interval = setInterval(() => {
        fetchLogs(selectedBot);
        fetchAnalytics(selectedBot);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedBot]);

  const fetchBots = async () => {
    try {
      const res = await fetch(`${API_BASE}/bots`);
      if (res.ok) {
        const data = await res.json();
        setBots(data);
        setSelectedBot(prev => {
          if (!prev && data.length > 0) {
            return data[0].name;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Failed to fetch bots", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (name: string) => {
    try {
      const res = await fetch(`${API_BASE}/bots/${name}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const fetchAnalytics = async (name: string) => {
    try {
      const res = await fetch(`${API_BASE}/bots/${name}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      // It's okay if analytics don't exist yet
    }
  };

  const handleStart = async (name: string) => {
    setActionLoading(name);
    try {
      await fetch(`${API_BASE}/bots/${name}/start`, { method: "POST" });
      await fetchBots();
      if (selectedBot === name) {
        fetchLogs(name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (name: string) => {
    setActionLoading(name);
    try {
      await fetch(`${API_BASE}/bots/${name}/stop`, { method: "POST" });
      await fetchBots();
      if (selectedBot === name) {
        fetchLogs(name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (name: string) => {
    setActionLoading(name);
    try {
      await fetch(`${API_BASE}/bots/${name}`, { method: "DELETE" });
      setDeleteBotName(null);
      if (selectedBot === name) {
        setSelectedBot(null);
        setLogs([]);
        setAnalytics(null);
      }
      fetchBots();
    } catch (err) {
      console.error("Failed to delete bot", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenSettings = async () => {
    if (!selectedBot) return;
    setIsSettingsOpen(true);
    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bots/${selectedBot}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettingsStreamers((data.streamers || []).join(", "));
        setSettingsWebhook(data.discord_webhook || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBot) return;
    setSettingsLoading(true);
    try {
      const streamersArray = settingsStreamers.split(",").map(s => s.trim()).filter(s => s);
      const res = await fetch(`${API_BASE}/bots/${selectedBot}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamers: streamersArray, discord_webhook: settingsWebhook }),
      });
      if (res.ok) {
        setIsSettingsOpen(false);
        // auto-restart bot if it's running
        const bot = bots.find(b => b.name === selectedBot);
        if (bot?.status === "Running") {
          await fetch(`${API_BASE}/bots/${selectedBot}/stop`, { method: "POST" });
          await fetch(`${API_BASE}/bots/${selectedBot}/start`, { method: "POST" });
          fetchBots();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleClearLogs = async (name: string) => {
    try {
      await fetch(`${API_BASE}/bots/${name}/clear-logs`, { method: "POST" });
      setLogs([]); // Immediately clear on frontend
      fetchLogs(name);
    } catch (err) {
      console.error("Failed to clear logs", err);
    }
  };

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBotError(null);
    try {
      const res = await fetch(`${API_BASE}/bots/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBotName }),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setNewBotName("");
        fetchBots();
      } else {
        setAddBotError("Failed to add bot. Check server logs.");
      }
    } catch (err) {
      console.error(err);
      setAddBotError("Error adding bot. Please try again.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-900 flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h1 className="font-bold text-lg tracking-tight">Twitch Miner</h1>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Bots</div>
          <div className="space-y-1">
            {bots.map((bot) => (
              <button
                key={bot.name}
                onClick={() => { setSelectedBot(bot.name); fetchBots(); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${selectedBot === bot.name ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${bot.status === 'Running' ? 'bg-green-500' : 'bg-neutral-500'}`} />
                  {bot.name}
                </div>
              </button>
            ))}
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <Button 
              variant="outline" 
              className="w-full mt-6 border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-white"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Bot
            </Button>
            <DialogContent className="bg-neutral-800 border-neutral-600 text-white shadow-2xl sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Bot</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Enter the bot username. Ensure you have copied your .pkl cookie file to the cookies directory on the server.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddBot}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Twitch Username</Label>
                    <Input
                      id="name"
                      value={newBotName}
                      onChange={(e) => setNewBotName(e.target.value)}
                      className="bg-neutral-800 border-neutral-700"
                      required
                    />
                  </div>
                  {addBotError && (
                    <div className="text-red-500 text-sm">
                      {addBotError}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit">Create Bot</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="p-4 border-t border-neutral-800">
          <Button variant="ghost" className="w-full justify-start text-neutral-400 hover:text-white hover:bg-neutral-800" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Delete Bot Dialog */}
      <Dialog open={!!deleteBotName} onOpenChange={(open) => !open && setDeleteBotName(null)}>
        <DialogContent className="bg-neutral-800 border-neutral-600 text-white shadow-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Are you sure you want to delete the bot "{deleteBotName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteBotName(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteBotName && handleDelete(deleteBotName)}>
              Delete Bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-neutral-800 border-neutral-600 text-white shadow-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bot Settings</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Configure parameters for "{selectedBot}". Changes require a bot restart to take effect.
            </DialogDescription>
          </DialogHeader>
          {settingsLoading ? (
            <div className="py-4 text-center text-neutral-400">Loading...</div>
          ) : (
            <form onSubmit={handleSaveSettings}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="streamers">Streamers (comma separated)</Label>
                  <Input
                    id="streamers"
                    value={settingsStreamers}
                    onChange={(e) => setSettingsStreamers(e.target.value)}
                    className="bg-neutral-800 border-neutral-700"
                    placeholder="fextralife, shroud, esl_csgo"
                  />
                  <p className="text-xs text-neutral-400">
                    Example: https://www.twitch.tv/<strong>username_streamers</strong>
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="webhook">Webhook URL (Discord, Telegram, etc)</Label>
                  <Input
                    id="webhook"
                    value={settingsWebhook}
                    onChange={(e) => setSettingsWebhook(e.target.value)}
                    className="bg-neutral-800 border-neutral-700"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={settingsLoading}>
                  {settingsLoading ? "Saving..." : "Save & Restart"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {selectedBot ? (() => {
          const bot = bots.find(b => b.name === selectedBot);
          return (
            <>
              {/* Header */}
              <header className="h-16 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold">{selectedBot}</h2>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-medium">
                    <div className={`w-2 h-2 rounded-full ${bot?.status === 'Running' ? 'bg-green-500' : 'bg-neutral-500'}`} />
                    {bot?.status}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-neutral-400 hover:text-white rounded-full bg-neutral-800" 
                    onClick={async () => {
                      setIsRefreshingStatus(true);
                      await fetchBots();
                      setTimeout(() => setIsRefreshingStatus(false), 500); // minimum animation time
                    }}
                    title="Refresh Bot Status"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingStatus ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {bot?.status === 'Running' ? (
                    <Button variant="destructive" size="sm" onClick={() => handleStop(selectedBot)} disabled={actionLoading === selectedBot}>
                      <Square className="w-4 h-4 mr-2 fill-current" />
                      {actionLoading === selectedBot ? "Stopping..." : "Stop"}
                    </Button>
                  ) : (
                    <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => handleStart(selectedBot)} disabled={actionLoading === selectedBot}>
                      <Play className="w-4 h-4 mr-2 fill-current" />
                      {actionLoading === selectedBot ? "Starting..." : "Start"}
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 ml-2 transition-colors">
                      <Settings className="w-5 h-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-neutral-900 border-neutral-800 text-white">
                      <DropdownMenuItem 
                        className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800 focus:text-white"
                        onClick={handleOpenSettings}
                        disabled={actionLoading === selectedBot}
                      >
                        Bot Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer text-red-500 hover:bg-neutral-800 hover:text-red-400 focus:bg-neutral-800 focus:text-red-400"
                        onClick={() => setDeleteBotName(selectedBot)}
                        disabled={actionLoading === selectedBot}
                      >
                        Delete Bot
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                <Tabs defaultValue="logs" className="w-full h-full flex flex-col">
                  <TabsList className="bg-neutral-900 border border-neutral-800 w-fit">
                    <TabsTrigger value="logs" className="text-neutral-300 hover:text-white data-[state=active]:bg-neutral-800 data-[state=active]:text-white">
                      <Terminal className="w-4 h-4 mr-2" />
                      Console Logs
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="text-neutral-300 hover:text-white data-[state=active]:bg-neutral-800 data-[state=active]:text-white">
                      <Activity className="w-4 h-4 mr-2" />
                      Analytics
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="logs" className="flex-1 mt-4">
                    <Card className="h-[calc(100vh-12rem)] bg-neutral-900 border-neutral-800 flex flex-col">
                      <CardHeader className="py-3 px-4 border-b border-neutral-800 shrink-0">
                        <CardTitle className="text-sm font-medium flex items-center justify-between text-neutral-200">
                          Live Terminal Output
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-neutral-400 hover:text-white" 
                              onClick={async () => {
                                setIsRefreshingLogs(true);
                                await fetchLogs(selectedBot);
                                setTimeout(() => setIsRefreshingLogs(false), 500); // minimum animation time
                              }}
                              title="Refresh Logs"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-950/30" 
                              onClick={() => handleClearLogs(selectedBot)}
                              title="Clear Logs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 flex-1 overflow-hidden relative">
                        <ScrollArea className="h-full w-full">
                          <div className="p-4 font-mono text-xs text-neutral-300 leading-relaxed">
                            {logs.length > 0 ? (
                              logs.map((log, i) => (
                                <div key={i} className="whitespace-pre-wrap font-mono break-all mb-1">{log}</div>
                              ))
                            ) : (
                              <div className="text-neutral-500 italic">No logs available. Start the bot to generate logs.</div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="analytics" className="flex-1 mt-4">
                    <div className="flex flex-col gap-4 h-full">
                      {/* Global Total Points Card */}
                      <Card className="bg-neutral-900 border-neutral-800 shrink-0">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-neutral-400">Global Total Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-white">
                            {analytics ? Object.values(analytics).reduce((sum: number, streamerData: any) => {
                              const series = streamerData.series;
                              if (series && series.length > 0) return sum + series[series.length - 1].y;
                              return sum;
                            }, 0).toLocaleString() : '—'}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Points Per Streamer Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 shrink-0">
                        {analytics && Object.entries(analytics).map(([streamer, data]: [string, any]) => {
                          const series = data.series;
                          const total = series && series.length > 0 ? series[series.length - 1].y : 0;
                          return (
                            <Card key={streamer} className="bg-neutral-900 border-neutral-800">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-xs text-neutral-400 break-all">{streamer}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-xl font-semibold text-white">
                                  {total.toLocaleString()}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      
                      {/* Points History Chart */}
                      <Card className="bg-neutral-900 border-neutral-800 flex-1 flex flex-col min-h-[400px]">
                        <CardHeader className="flex flex-row items-center justify-between shrink-0 py-3">
                          <CardTitle className="text-lg">Points History</CardTitle>
                          <Select value={analyticsFilter} onValueChange={(val) => setAnalyticsFilter(val || "All")}>
                            <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700 text-white">
                              <SelectValue placeholder="Filter by Streamer" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                              <SelectItem value="All">All Streamers</SelectItem>
                              {analytics && Object.keys(analytics).map(streamer => (
                                <SelectItem key={streamer} value={streamer}>{streamer}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 relative p-4">
                          {analytics && Object.keys(analytics).length > 0 ? (() => {
                            let chartData: any[] = [];
                            if (analyticsFilter === "All") {
                              const allEvents: { time: number, streamer: string, y: number }[] = [];
                              Object.entries(analytics).forEach(([streamer, data]: [string, any]) => {
                                if (data.series) {
                                  data.series.forEach((pt: any) => {
                                    allEvents.push({ time: pt.x, streamer, y: pt.y });
                                  });
                                }
                              });
                              allEvents.sort((a, b) => a.time - b.time);
                              const latestPoints: Record<string, number> = {};
                              allEvents.forEach(ev => {
                                latestPoints[ev.streamer] = ev.y;
                                const total = Object.values(latestPoints).reduce((sum, val) => sum + val, 0);
                                chartData.push({ x: ev.time, y: total });
                              });
                            } else {
                              chartData = analytics[analyticsFilter]?.series || [];
                            }

                            return (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart margin={{ top: 10, right: 30, left: 10, bottom: 5 }} data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                  <XAxis 
                                    dataKey="x" 
                                    type="number"
                                    scale="time"
                                    domain={['dataMin', 'dataMax']} 
                                    tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
                                    stroke="#d4d4d4" 
                                    allowDuplicatedCategory={false}
                                  />
                                  <YAxis stroke="#d4d4d4" tickFormatter={(value) => value.toLocaleString()} width={70} />
                                  <Tooltip 
                                    labelFormatter={(label) => new Date(label as number).toLocaleString()}
                                    formatter={(value: any) => [Number(value).toLocaleString(), "Points"]}
                                    contentStyle={{ backgroundColor: '#262626', borderColor: '#404040', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                  />
                                  <Line 
                                    type="stepAfter" 
                                    dataKey="y" 
                                    stroke="#10b981" 
                                    dot={false}
                                    strokeWidth={2}
                                    name={analyticsFilter === "All" ? "Global Points" : analyticsFilter}
                                    isAnimationActive={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            );
                          })() : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500 italic">
                              No analytics data available yet.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          );
        })() : (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            Select a bot from the sidebar or add a new one.
          </div>
        )}
      </main>
    </div>
  );
}
