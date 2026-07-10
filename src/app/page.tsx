"use client";

import { useState, useEffect, useRef } from "react";
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
import { Play, Square, Activity, Terminal, Plus, LogOut, RefreshCw, Trash2, Settings, Calendar, Clock, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = "/api";

type Bot = {
  name: string;
  status: "Running" | "Stopped";
  session: string;
};

const cleanLog = (log: string) => {
  const match = log.match(/^([A-Za-z]{3})\s+(\d+)\s+(\d{2}:\d{2}:\d{2})\s+\S+\s+[^:]+:\s*(?:\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s*)?(.*)/);
  if (match) {
    const month = match[1];
    const date = match[2];
    const time = match[3];
    const rest = match[4];
    const year = new Date().getFullYear();
    return `${month} ${date} ${year} ${time} ${rest}`.trim();
  }
  return log;
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
  const logsViewportRef = useRef<HTMLDivElement>(null);
  const [isLogsScrolledUp, setIsLogsScrolledUp] = useState(false);

  const handleLogsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    setIsLogsScrolledUp(!isAtBottom);
  };

  const scrollToLogsBottom = () => {
    if (logsViewportRef.current) {
      logsViewportRef.current.scrollTo({
        top: logsViewportRef.current.scrollHeight,
        behavior: "smooth"
      });
      setIsLogsScrolledUp(false);
    }
  };

  useEffect(() => {
    if (!isLogsScrolledUp) {
      scrollToLogsBottom();
    }
  }, [logs]);

  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [filterStartTs, setFilterStartTs] = useState<number | null>(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [filterEndTs, setFilterEndTs] = useState<number | null>(Date.now());

  // Time range picker state
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [timePickerTab, setTimePickerTab] = useState<"relative" | "absolute">("relative");
  const [timeRangeLabel, setTimeRangeLabel] = useState("Since 1 week ago");
  const [relativeRange, setRelativeRange] = useState("1w");
  const [customDuration, setCustomDuration] = useState("");
  const [customUnit, setCustomUnit] = useState("minute");
  const [absStartDate, setAbsStartDate] = useState("");
  const [absStartTime, setAbsStartTime] = useState("");
  const [absEndDate, setAbsEndDate] = useState("");
  const [absEndTime, setAbsEndTime] = useState("");
  const timePickerRef = useRef<HTMLDivElement>(null);

  // Close time picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) {
        setIsTimePickerOpen(false);
      }
    };
    if (isTimePickerOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTimePickerOpen]);

  const applyRelativeRange = (range: string) => {
    const now = new Date();
    let ms = 0;
    let label = "";
    switch (range) {
      case "1h": ms = 3600000; label = "Since 1 hour ago"; break;
      case "6h": ms = 6 * 3600000; label = "Since 6 hours ago"; break;
      case "1d": ms = 86400000; label = "Since 1 day ago"; break;
      case "3d": ms = 3 * 86400000; label = "Since 3 days ago"; break;
      case "1w": ms = 7 * 86400000; label = "Since 1 week ago"; break;
      case "2w": ms = 14 * 86400000; label = "Since 2 weeks ago"; break;
      case "1m": ms = 30 * 86400000; label = "Since 1 month ago"; break;
      case "custom":
        const dur = parseInt(customDuration) || 0;
        if (dur <= 0) return;
        const multiplier = customUnit === "minute" ? 60000 : customUnit === "hour" ? 3600000 : 86400000;
        ms = dur * multiplier;
        label = `Since ${dur} ${customUnit}${dur > 1 ? "s" : ""} ago`;
        break;
      default: return;
    }
    const start = new Date(now.getTime() - ms);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    setFilterStartTs(start.getTime());
    setFilterEndTs(now.getTime());
    setTimeRangeLabel(label);
    setIsTimePickerOpen(false);
    if (selectedBot) fetchAnalytics(selectedBot, start.toISOString().split('T')[0], now.toISOString().split('T')[0]);
  };

  const applyAbsoluteRange = () => {
    const s = absStartDate || startDate;
    const e = absEndDate || endDate;
    setStartDate(s);
    setEndDate(e);
    
    let startTs = new Date(s).getTime();
    if (absStartTime) {
      startTs = new Date(`${s}T${absStartTime}`).getTime();
    }
    
    let endTs = new Date(e).getTime();
    if (absEndTime) {
      endTs = new Date(`${e}T${absEndTime}`).getTime();
    } else {
      endTs = new Date(`${e}T23:59:59`).getTime();
    }
    
    setFilterStartTs(startTs);
    setFilterEndTs(endTs);

    const sLabel = s.split('-').reverse().join('/');
    const eLabel = e.split('-').reverse().join('/');
    setTimeRangeLabel(`${sLabel} — ${eLabel}`);
    setIsTimePickerOpen(false);
    if (selectedBot) fetchAnalytics(selectedBot, s, e);
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsStreamers, setSettingsStreamers] = useState("");
  const [settingsWebhook, setSettingsWebhook] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [streamerSort, setStreamerSort] = useState<"points" | "name">("points");
  const [isStreamerGridOpen, setIsStreamerGridOpen] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBot) {
      fetchLogs(selectedBot);
      fetchAnalytics(selectedBot, startDate, endDate);
      const interval = setInterval(() => {
        fetchLogs(selectedBot);
        fetchAnalytics(selectedBot, startDate, endDate);
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

  const fetchAnalytics = async (name: string, start?: string, end?: string) => {
    try {
      let url = `${API_BASE}/bots/${name}/analytics`;
      const params = new URLSearchParams();
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      const res = await fetch(url);
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
    // Clear old state before fetch in case of 404
    setSettingsStreamers("");
    setSettingsWebhook("");
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
                        onSelect={() => setTimeout(() => handleOpenSettings(), 0)}
                        disabled={actionLoading === selectedBot}
                      >
                        Bot Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer text-red-500 hover:bg-neutral-800 hover:text-red-400 focus:bg-neutral-800 focus:text-red-400"
                        onSelect={() => setTimeout(() => setDeleteBotName(selectedBot), 0)}
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
                        <ScrollArea className="h-full w-full" viewportRef={logsViewportRef} onScroll={handleLogsScroll}>
                          <div className="p-4 font-mono text-xs text-neutral-300 leading-relaxed">
                            {logs.length > 0 ? (
                              logs.map((log, i) => (
                                <div key={i} className="whitespace-pre-wrap font-mono break-all mb-1">{cleanLog(log)}</div>
                              ))
                            ) : (
                              <div className="text-neutral-500 italic">No logs available. Start the bot to generate logs.</div>
                            )}
                          </div>
                        </ScrollArea>
                        {isLogsScrolledUp && (
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-neutral-900/95 border border-neutral-700 text-neutral-300 text-xs font-medium pl-4 pr-1 py-1 rounded-full shadow-2xl backdrop-blur-md">
                            You're Viewing Older Messages
                            <button
                              onClick={scrollToLogsBottom}
                              className="bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 rounded-full transition-colors font-semibold"
                            >
                              Jump To Present
                            </button>
                          </div>
                        )}
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

                      {/* Sort label + HR + expand/collapse */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setStreamerSort(streamerSort === "points" ? "name" : "points")}
                            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {streamerSort === "points" ? "Sorted by most points" : "Sorted by name"}
                          </button>
                        </div>
                        <div className="flex-1 border-t border-neutral-700" />
                        <button
                          onClick={() => setIsStreamerGridOpen(!isStreamerGridOpen)}
                          className="text-neutral-400 hover:text-white transition-all shrink-0"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStreamerGridOpen ? '' : '-rotate-90'}`} />
                        </button>
                      </div>

                      {/* Points Per Streamer Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 shrink-0">
                          {analytics && (() => {
                            const entries = Object.entries(analytics).map(([streamer, data]: [string, any]) => {
                              const series = data.series;
                              const total = series && series.length > 0 ? series[series.length - 1].y : 0;
                              return { streamer, total };
                            });
                            if (streamerSort === "points") {
                              entries.sort((a, b) => b.total - a.total);
                            } else {
                              entries.sort((a, b) => a.streamer.localeCompare(b.streamer));
                            }
                            const visible = isStreamerGridOpen ? entries : entries.slice(0, 5);
                            return visible.map(({ streamer, total }) => (
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
                            ));
                          })()}
                        </div>
                      
                      {/* Points History Chart */}
                      <Card className="bg-neutral-900 border-neutral-800 flex-1 flex flex-col min-h-[400px] mb-6 overflow-visible">
                        <CardHeader className="flex flex-row items-center justify-between shrink-0 py-3 gap-4 flex-wrap overflow-visible">
                          <CardTitle className="text-lg text-white">Points History</CardTitle>
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* AWS-style Time Range Picker */}
                            <div className="relative" ref={timePickerRef}>
                              <button
                                onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
                                className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-white rounded-md px-3 py-1.5 text-sm hover:border-neutral-500 transition-colors h-9"
                              >
                                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                                <span className="text-xs">{timeRangeLabel}</span>
                              </button>

                              {isTimePickerOpen && (
                                <div className="absolute right-0 top-full mt-2 z-[100] w-[340px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl">
                                  {/* Tabs */}
                                  <div className="flex items-center gap-1 p-3 pb-2">
                                    <button
                                      onClick={() => setTimePickerTab("relative")}
                                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                        timePickerTab === "relative"
                                          ? "bg-sky-600 text-white"
                                          : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                      }`}
                                    >
                                      Relative range
                                    </button>
                                    <button
                                      onClick={() => setTimePickerTab("absolute")}
                                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                        timePickerTab === "absolute"
                                          ? "bg-sky-600 text-white"
                                          : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                      }`}
                                    >
                                      Absolute range
                                    </button>
                                  </div>

                                  <div className="border-t border-neutral-800" />

                                  {timePickerTab === "relative" ? (
                                    <div className="p-3">
                                      <p className="text-xs font-medium text-neutral-300 mb-2">Choose a range</p>
                                      <div className="space-y-0.5">
                                        {[
                                          { value: "1h", label: "Since 1 hour ago" },
                                          { value: "6h", label: "Since 6 hours ago" },
                                          { value: "1d", label: "Since 1 day ago" },
                                          { value: "3d", label: "Since 3 days ago" },
                                          { value: "1w", label: "Since 1 week ago" },
                                          { value: "2w", label: "Since 2 weeks ago" },
                                          { value: "1m", label: "Since 1 month ago" },
                                        ].map((opt) => (
                                          <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-800 cursor-pointer">
                                            <input
                                              type="radio"
                                              name="relRange"
                                              checked={relativeRange === opt.value}
                                              onChange={() => setRelativeRange(opt.value)}
                                              className="accent-sky-500 w-3.5 h-3.5"
                                            />
                                            <span className="text-xs text-neutral-200">{opt.label}</span>
                                          </label>
                                        ))}
                                        <label className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-neutral-800 cursor-pointer">
                                          <input
                                            type="radio"
                                            name="relRange"
                                            checked={relativeRange === "custom"}
                                            onChange={() => setRelativeRange("custom")}
                                            className="accent-sky-500 w-3.5 h-3.5 mt-0.5"
                                          />
                                          <div>
                                            <span className="text-xs text-neutral-200 font-medium">Custom range</span>
                                            <p className="text-[10px] text-neutral-500">Set a custom range in the past</p>
                                          </div>
                                        </label>
                                      </div>

                                      {relativeRange === "custom" && (
                                        <div className="flex gap-2 mt-3">
                                          <div className="flex-1">
                                            <p className="text-[10px] text-neutral-400 mb-1">Duration</p>
                                            <input
                                              type="number"
                                              min="1"
                                              value={customDuration}
                                              onChange={(e) => setCustomDuration(e.target.value)}
                                              placeholder="Enter duration"
                                              className="w-full bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1.5 text-xs"
                                            />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-[10px] text-neutral-400 mb-1">Unit of time</p>
                                            <select
                                              value={customUnit}
                                              onChange={(e) => setCustomUnit(e.target.value)}
                                              className="w-full bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1.5 text-xs appearance-none"
                                            >
                                              <option value="minute">minute</option>
                                              <option value="hour">hour</option>
                                              <option value="day">day</option>
                                            </select>
                                          </div>
                                        </div>
                                      )}

                                      {/* Footer */}
                                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-800">
                                        <button onClick={() => { setIsTimePickerOpen(false); }} className="text-xs text-sky-400 hover:text-sky-300">
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => applyRelativeRange(relativeRange)}
                                          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded-md font-medium transition-colors"
                                        >
                                          Apply
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-[10px] text-neutral-400 mb-1">Start date</p>
                                          <input
                                            type="date"
                                            value={absStartDate || startDate}
                                            onChange={(e) => setAbsStartDate(e.target.value)}
                                            className="w-full bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1.5 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-neutral-400 mb-1">Start time</p>
                                          <input
                                            type="time"
                                            step="1"
                                            value={absStartTime}
                                            onChange={(e) => setAbsStartTime(e.target.value)}
                                            placeholder="hh:mm:ss"
                                            className="w-full bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1.5 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-neutral-400 mb-1">End date</p>
                                          <input
                                            type="date"
                                            value={absEndDate || endDate}
                                            onChange={(e) => setAbsEndDate(e.target.value)}
                                            className="w-full bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1.5 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-neutral-400 mb-1">End time</p>
                                          <input
                                            type="time"
                                            step="1"
                                            value={absEndTime}
                                            onChange={(e) => setAbsEndTime(e.target.value)}
                                            placeholder="hh:mm:ss"
                                            className="w-full bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1.5 text-xs"
                                          />
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-neutral-500 mt-2">Use YYYY/MM/DD for date. Time is 24h format.</p>

                                      {/* Footer */}
                                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-800">
                                        <button onClick={() => { setIsTimePickerOpen(false); }} className="text-xs text-sky-400 hover:text-sky-300">
                                          Cancel
                                        </button>
                                        <button
                                          onClick={applyAbsoluteRange}
                                          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded-md font-medium transition-colors"
                                        >
                                          Apply
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

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
                          </div>
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

                            if (filterStartTs !== null && filterEndTs !== null) {
                              chartData = chartData.filter((pt: any) => pt.x >= filterStartTs && pt.x <= filterEndTs);
                            }

                            return (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart margin={{ top: 10, right: 30, left: 10, bottom: 40 }} data={chartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                  <XAxis 
                                    dataKey="x" 
                                    type="number"
                                    domain={['dataMin', 'dataMax']} 
                                    tickFormatter={(unixTime) => {
                                      const d = new Date(unixTime);
                                      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    }}
                                    stroke="#d4d4d4" 
                                    tick={{ fontSize: 9 }}
                                    angle={-45}
                                    textAnchor="end"
                                    ticks={(() => {
                                      if (chartData.length <= 8) return undefined;
                                      const min = chartData[0]?.x;
                                      const max = chartData[chartData.length - 1]?.x;
                                      if (!min || !max || min === max) return undefined;
                                      const step = (max - min) / 7;
                                      return Array.from({ length: 8 }, (_, i) => min + step * i);
                                    })()}
                                    height={60}
                                  />
                                  <YAxis stroke="#d4d4d4" tickFormatter={(value) => value.toLocaleString()} width={70} />
                                  <Tooltip 
                                    labelFormatter={(label) => new Date(label as number).toLocaleString()}
                                    formatter={(value: any, name: any, props: any) => [
                                      Number(value).toLocaleString(), 
                                      props.payload.z ? `Points (${props.payload.z})` : "Points"
                                    ]}
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
