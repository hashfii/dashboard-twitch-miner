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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Play, Square, Activity, Terminal, Plus, LogOut, RefreshCw } from "lucide-react";
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
  const [newBotCookies, setNewBotCookies] = useState("");
  const [loading, setLoading] = useState(true);
  
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
        if (!selectedBot && data.length > 0) {
          setSelectedBot(data[0].name);
        }
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
    try {
      await fetch(`${API_BASE}/bots/${name}/start`, { method: "POST" });
      fetchBots();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop = async (name: string) => {
    try {
      await fetch(`${API_BASE}/bots/${name}/stop`, { method: "POST" });
      fetchBots();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/bots/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBotName, cookies: newBotCookies }),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setNewBotName("");
        setNewBotCookies("");
        fetchBots();
      } else {
        alert("Failed to add bot");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding bot");
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
                onClick={() => setSelectedBot(bot.name)}
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
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Bot</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Enter the bot username and paste the Twitch cookies (JSON format).
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
                  <div className="grid gap-2">
                    <Label htmlFor="cookies">Cookies (JSON array)</Label>
                    <Textarea
                      id="cookies"
                      value={newBotCookies}
                      onChange={(e) => setNewBotCookies(e.target.value)}
                      className="bg-neutral-800 border-neutral-700 h-32 font-mono text-xs"
                      required
                      placeholder={'[{"domain": ".twitch.tv", "name": "auth-token", ...}]'}
                    />
                  </div>
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
                </div>
                <div className="flex items-center gap-2">
                  {bot?.status === 'Running' ? (
                    <Button variant="destructive" size="sm" onClick={() => handleStop(selectedBot)}>
                      <Square className="w-4 h-4 mr-2 fill-current" />
                      Stop
                    </Button>
                  ) : (
                    <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => handleStart(selectedBot)}>
                      <Play className="w-4 h-4 mr-2 fill-current" />
                      Start
                    </Button>
                  )}
                </div>
              </header>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                <Tabs defaultValue="logs" className="w-full h-full flex flex-col">
                  <TabsList className="bg-neutral-900 border border-neutral-800 w-fit">
                    <TabsTrigger value="logs" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white">
                      <Terminal className="w-4 h-4 mr-2" />
                      Console Logs
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white">
                      <Activity className="w-4 h-4 mr-2" />
                      Analytics
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="logs" className="flex-1 mt-4">
                    <Card className="h-[calc(100vh-12rem)] bg-neutral-900 border-neutral-800 flex flex-col">
                      <CardHeader className="py-3 px-4 border-b border-neutral-800 shrink-0">
                        <CardTitle className="text-sm font-medium flex items-center justify-between text-neutral-200">
                          Live Terminal Output
                          <RefreshCw className="w-3 h-3 text-neutral-500 animate-spin-slow" />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {/* Metric Cards */}
                      <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-neutral-400">Total Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white">
                            {analytics ? 'TBD' : '—'}
                          </div>
                        </CardContent>
                      </Card>
                      {/* Add more metrics based on the JSON structure of analytics... For now placeholders */}
                    </div>
                    
                    <Card className="bg-neutral-900 border-neutral-800 col-span-full h-96">
                      <CardHeader>
                        <CardTitle>Points History</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        {analytics ? (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500">
                            Analytics chart will be rendered here once data format is known.
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500 italic">
                            No analytics data available yet.
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
