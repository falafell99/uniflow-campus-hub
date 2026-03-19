import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  Video, BookOpen, Clock, User, Sparkles, X, Loader2, Trash2, Upload
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from "date-fns";
import ICAL from "ical.js";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { initReminders } from "@/lib/reminders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SyllabusImporter } from "@/components/SyllabusImporter";
import { Settings2 } from "lucide-react";

type EventType = "exam" | "deadline" | "meetup" | "personal";

interface CampusEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_time: string;
  end_time: string | null;
  user_id: string;
  calendar_name?: string | null;
}

const EVENT_COLORS: Record<EventType, string> = {
  exam: "bg-red-500/10 text-red-600 border-red-500/20",
  deadline: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  meetup: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  personal: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  exam: <BookOpen className="h-3 w-3" />,
  deadline: <Clock className="h-3 w-3" />,
  meetup: <Video className="h-3 w-3" />,
  personal: <User className="h-3 w-3" />,
};

export default function Calendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week">("week");
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // New Event Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("personal");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showCalendarsPanel, setShowCalendarsPanel] = useState(false);
  // Map of calendarName -> hex color
  const [calendarColors, setCalendarColors] = useState<Record<string, string>>({});
  const weekGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calendarView === "week" && weekGridRef.current) {
      // Small timeout ensures the DOM layout is calculated before scrolling
      setTimeout(() => {
        if (weekGridRef.current) {
          weekGridRef.current.scrollTop = 8 * 60;
        }
      }, 50);
    }
  }, [calendarView]);

  useEffect(() => {
    fetchEvents();
    
    // Real-time subscription
    const channel = supabase
      .channel('campus_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_events' }, payload => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('campus_events')
        .select('*')
        .order('start_time', { ascending: true });
        
      if (error) throw error;
      setEvents(data || []);
      // Auto-detect unique calendar sources from events
      const sourceColors: Record<string, string> = {};
      const palette = ["#6366f1","#10b981","#f59e0b","#3b82f6","#ec4899","#8b5cf6","#14b8a6","#f97316"];
      let colorIdx = 0;
      (data || []).forEach((e: CampusEvent) => {
        if (e.calendar_name && !sourceColors[e.calendar_name]) {
          sourceColors[e.calendar_name] = palette[colorIdx % palette.length];
          colorIdx++;
        }
      });
      setCalendarColors(prev => ({ ...sourceColors, ...prev }));
    } catch (error: any) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!user || !title.trim() || !selectedDate) return;
    
    // Parse time
    const startDateTime = new Date(selectedDate);
    const [startH, startM] = startTime.split(":").map(Number);
    startDateTime.setHours(startH || 0, startM || 0, 0, 0);

    const endDateTime = new Date(selectedDate);
    const [endH, endM] = endTime.split(":").map(Number);
    endDateTime.setHours(endH || 0, endM || 0, 0, 0);

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('campus_events')
        .insert({
          title,
          description,
          event_type: eventType,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          user_id: user.id
        });

      if (error) throw error;
      
      if (eventType === "deadline") {
        toast.success("Deadline created!", {
          action: {
            label: "Create task →",
            onClick: () => navigate("/tasks", {
              state: { prefillTitle: title, prefillDue: selectedDate?.toISOString() }
            })
          },
          duration: 6000
        });
      } else {
        toast.success("Event created!");
      }

      if (eventType === "deadline" || eventType === "exam") {
        initReminders(user.id);
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('campus_events').delete().eq('id', id);
      if (error) throw error;
      toast.success("Event deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventType("personal");
    setStartTime("09:00");
    setEndTime("10:00");
  };

  const openDayDetailModal = (date: Date) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  };

  const openNewEventModal = () => {
    if (!selectedDate) setSelectedDate(new Date());
    setIsModalOpen(true);
  };

  const openNewEventModalWithTime = (date: Date, hour: number) => {
    setSelectedDate(date);
    setStartTime(`${hour.toString().padStart(2, '0')}:00`);
    setEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`);
    setIsModalOpen(true);
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  const handleImportIcs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const jcalData = ICAL.parse(text);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents("vevent");

      const calendarName = file.name.replace(/\.ics$/i, "");
      const newEvents = vevents.map(vevent => {
        const event = new ICAL.Event(vevent);
        return {
          title: event.summary || "Imported Event",
          description: event.description || "Imported from Calendar",
          event_type: "personal" as EventType,
          start_time: event.startDate.toJSDate().toISOString(),
          end_time: event.endDate ? event.endDate.toJSDate().toISOString() : null,
          user_id: user.id,
          calendar_name: calendarName,
        };
      });

      if (newEvents.length === 0) {
        toast.error("No events found in file");
        return;
      }

      const { error } = await supabase.from('campus_events').insert(newEvents);
      if (error) throw error;
      
      toast.success(`Successfully imported ${newEvents.length} events!`);
      fetchEvents();
    } catch (error: any) {
      console.error("ICS Import Error:", error);
      toast.error("Failed to parse .ics file: " + error.message);
    } finally {
      setIsImporting(false);
      // Reset input
      e.target.value = "";
    }
  };

  const jumpToToday = () => setCurrentMonth(new Date());

  const renderHeader = () => {
    return (
      <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-4 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            Campus Calendar
          </h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">Track your exams, deadlines, and meetups</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted/30 p-1 rounded-lg border border-border/40">
            <button onClick={() => setCalendarView("month")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${calendarView === "month" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Month</button>
            <button onClick={() => setCalendarView("week")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${calendarView === "week" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Week</button>
          </div>

          <div className="flex items-center bg-muted/30 p-1 rounded-lg border border-border/40">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-bold text-sm min-w-[120px] text-center">{format(currentMonth, calendarView === "month" ? "MMMM yyyy" : "MMM yyyy")}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" size="sm" onClick={jumpToToday}>Today</Button>
          
            <Button onClick={() => setShowCalendarsPanel(!showCalendarsPanel)} size="sm" variant={showCalendarsPanel ? "default" : "outline"} className="shrink-0">
              <Settings2 className="h-4 w-4 mr-1.5" />
              Calendars
            </Button>
            
            <div className="relative flex items-center">
              <input 
                type="file" 
                accept=".ics" 
                onChange={handleImportIcs} 
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                title="Import .ICS file"
                disabled={isImporting}
              />
              <Button variant="outline" size="sm" className="w-full shrink-0" disabled={isImporting}>
                {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import .ICS
              </Button>
            </div>
            
            <Button onClick={() => setIsSyllabusModalOpen(true)} size="sm" variant="default" className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white border-0">
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI Syllabus Sync
            </Button>
            
            <Button onClick={openNewEventModal} size="sm" variant="outline" className="shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              Add Event
            </Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = "EEEE";
    const days = [];
    let startDate = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Monday start

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center font-bold text-xs uppercase tracking-wider text-muted-foreground py-3 border-b border-border/40" key={i}>
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        // Find events for this day
        const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), cloneDay));

        days.push(
          <div
            className={`min-h-[120px] p-2 border border-border/20 transition-all cursor-pointer hover:bg-muted/10 group ${
              !isSameMonth(day, monthStart)
                ? "text-muted-foreground/30 bg-muted/5 inline-block"
                : isSameDay(day, new Date())
                ? "bg-primary/5 text-primary border-primary/20"
                : "text-foreground bg-card"
            }`}
            key={day.toString()}
            onClick={() => openDayDetailModal(cloneDay)}
          >
            <div className="flex justify-between items-start">
              <span className={`font-semibold text-sm h-7 w-7 flex items-center justify-center rounded-full ${
                isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : ""
              }`}>
                {formattedDate}
              </span>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-primary">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mt-2 flex flex-col gap-1.5 custom-scroll overflow-y-auto max-h-[80px]">
              {dayEvents.map(event => (
                <div 
                  key={event.id}
                  className={`text-xs p-1.5 rounded-md border flex items-center justify-between group/event ${EVENT_COLORS[event.event_type]}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Open edit modal future implementation
                  }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {EVENT_ICONS[event.event_type]}
                    <span className="font-semibold truncate">{event.title}</span>
                  </div>
                  <button onClick={(e) => handleDeleteEvent(event.id, e)} className="opacity-0 group-hover/event:opacity-100 text-current hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="rounded-xl overflow-hidden border border-border/40 shadow-sm flex-1 custom-scroll min-h-0 overflow-y-auto">{rows}</div>;
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col flex-1 border border-border/40 rounded-3xl bg-card overflow-hidden shadow-sm relative z-10 w-full min-h-0">
        {/* Header */}
        <div className="flex border-b border-border/40 bg-muted/20">
          <div className="w-16 shrink-0 border-r border-border/40" />
          {days.map(day => (
            <div 
              key={day.toString()} 
              className="flex-1 text-center py-3 border-r border-border/40 last:border-r-0 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => openDayDetailModal(day)}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{format(day, "EEE")}</div>
              <div className={`text-xl font-black mt-1 ${isSameDay(day, new Date()) ? "text-primary" : "text-foreground"}`}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
        
        {/* Grid Body */}
        <div ref={weekGridRef} className="flex-1 overflow-y-auto relative custom-scroll block" id="week-grid">
          <div className="flex min-h-max relative" style={{ height: `${24 * 60}px` }}>
            {/* Time Labels */}
            <div className="w-16 shrink-0 border-r border-border/40 relative bg-background/50 z-10">
              {hours.map(hour => (
                <div key={hour} className="absolute w-full text-right pr-2 text-[10px] font-bold text-muted-foreground" style={{ top: `${hour * 60 - 7}px` }}>
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </div>
              ))}
            </div>

            {/* Vertical Columns */}
            <div className="flex-1 flex relative">
              {/* Horizontal grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                {hours.map(hour => (
                  <div key={`line-${hour}`} className="absolute w-full border-t border-border/10" style={{ top: `${hour * 60}px` }} />
                ))}
              </div>

              {/* Day Columns */}
              {days.map((day, dayIndex) => {
                const dayEvents = events
                  .filter(e => isSameDay(parseISO(e.start_time), day))
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                // Overlap detection: assign column slots
                type EvtLayout = { event: CampusEvent; col: number; totalCols: number; top: number; height: number };
                const layout: EvtLayout[] = [];
                // columns[i] = end-time of last event in column i
                const colEnds: number[] = [];

                dayEvents.forEach(event => {
                  const evtStartDate = parseISO(event.start_time);
                  const evtEndDate = event.end_time ? parseISO(event.end_time) : new Date(evtStartDate.getTime() + 60 * 60 * 1000);
                  const startPx = (evtStartDate.getHours() + evtStartDate.getMinutes() / 60) * 60;
                  const endPx = (evtEndDate.getHours() + evtEndDate.getMinutes() / 60) * 60;
                  const height = Math.max(30, endPx - startPx);
                  // Use visual end (startPx + height) so zero-duration events still occupy space
                  const visualEnd = startPx + height;

                  // Find a free column: strictly less-than so events starting at exact same px don't share a slot
                  let col = colEnds.findIndex(end => end <= startPx);
                  if (col === -1) { col = colEnds.length; colEnds.push(visualEnd); } else { colEnds[col] = visualEnd; }

                  layout.push({ event, col, totalCols: 0, top: startPx, height });
                });

                // Assign totalCols by grouping overlapping events
                layout.forEach((item, i) => {
                  // Find the max column index of all events that overlap with this one
                  let maxCol = item.col;
                  layout.forEach((other, j) => {
                    if (i !== j) {
                      const overlaps = item.top < other.top + other.height && item.top + item.height > other.top;
                      if (overlaps) maxCol = Math.max(maxCol, other.col);
                    }
                  });
                  item.totalCols = maxCol + 1;
                });

                const PADDING = 3;

                return (
                  <div key={`col-${dayIndex}`} className="flex-1 relative border-r border-border/20 last:border-r-0 group/col">
                    {/* Clickable background */}
                    <div
                      className="absolute inset-0 cursor-pointer hover:bg-muted/5 transition-colors"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const clickedHour = Math.floor(y / 60);
                        openNewEventModalWithTime(day, clickedHour);
                      }}
                    />

                    {layout.map(({ event, col, totalCols, top, height }) => {
                      const w = 100 / totalCols;
                      const left = col * w;
                      const calColor = event.calendar_name ? calendarColors[event.calendar_name] : null;
                      const style: React.CSSProperties = {
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `calc(${left}% + ${PADDING}px)`,
                        width: `calc(${w}% - ${PADDING * 2}px)`,
                        ...(calColor ? {
                          backgroundColor: calColor + "28",
                          borderColor: calColor + "66",
                          color: calColor,
                        } : {}),
                      };

                      return (
                        <div
                          key={event.id}
                          className={`absolute rounded-md border p-1 text-xs overflow-hidden cursor-pointer hover:shadow-md hover:z-20 transition-all ${!calColor ? EVENT_COLORS[event.event_type] : ""}`}
                          style={style}
                          onClick={(e) => { e.stopPropagation(); openDayDetailModal(day); }}
                        >
                          <div className="font-bold truncate leading-tight flex items-center gap-0.5" style={{ fontSize: "10px" }}>
                            {!calColor && EVENT_ICONS[event.event_type]}
                            {calColor && <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: calColor }} />}
                            <span className="truncate">{event.title}</span>
                          </div>
                          <div className="opacity-80 mt-0.5" style={{ fontSize: "9px" }}>{format(parseISO(event.start_time), "h:mm a")}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-100px)] animate-in fade-in duration-500 overflow-hidden">
      {renderHeader()}
      
      <div className="flex-1 bg-card p-3 lg:p-6 rounded-3xl border border-border/50 shadow-2xl relative overflow-hidden flex flex-col min-h-0">
        {/* Decorative background glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Calendars panel */}
        {showCalendarsPanel && (
          <div className="mb-4 p-4 rounded-2xl border border-border/40 bg-muted/20 shrink-0 z-10">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Imported Calendars</p>
            {Object.keys(calendarColors).length === 0 ? (
              <p className="text-xs text-muted-foreground">No imported calendars yet. Import an .ICS file to get started.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {Object.entries(calendarColors).map(([name, color]) => (
                  <label key={name} className="flex items-center gap-2 cursor-pointer py-1.5 px-3 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/30 transition-colors">
                    <input
                      type="color"
                      value={color}
                      onChange={e => setCalendarColors(prev => ({ ...prev, [name]: e.target.value }))}
                      className="h-5 w-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span className="text-xs font-semibold">{name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-2 lg:gap-4 mb-4 text-xs font-semibold px-2 shrink-0 z-10">
          {Object.entries(EVENT_COLORS).map(([type, colorClass]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full border ${colorClass.split(' ')[0]} ${colorClass.split(' ')[2]}`} />
              <span className="capitalize text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>

        {calendarView === "month" ? (
          <>
            {renderDays()}
            {renderCells()}
          </>
        ) : (
          renderWeekView()
        )}
      </div>

      {/* Day Detail Modal */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              <Button size="sm" onClick={openNewEventModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3 custom-scroll">
            {selectedDate && events.filter(e => isSameDay(parseISO(e.start_time), selectedDate)).length > 0 ? (
              events.filter(e => isSameDay(parseISO(e.start_time), selectedDate))
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                .map(event => (
                  <div key={event.id} className={`p-4 rounded-xl border flex flex-col gap-2 relative group ${EVENT_COLORS[event.event_type]}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-background/50 rounded-lg shadow-sm border border-current/10">
                          {EVENT_ICONS[event.event_type]}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-base tracking-tight">{event.title}</h4>
                          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{event.event_type}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteEvent(event.id, e)} 
                        className="opacity-0 group-hover:opacity-100 p-2 text-current hover:bg-destructive/10 hover:text-destructive transition-all rounded-md"
                        title="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm mt-1 opacity-90 pl-[40px]">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(parseISO(event.start_time), "h:mm a")}</span>
                        {event.end_time && (
                          <>
                            <span className="mx-1 opacity-50">-</span>
                            <span>{format(parseISO(event.end_time), "h:mm a")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {event.description && (
                      <p className="text-sm mt-2 pl-[40px] text-foreground/80 whitespace-pre-wrap">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border/40 rounded-xl">
                <CalendarIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-foreground">No events scheduled</p>
                <p className="text-sm text-muted-foreground mt-1">Enjoy your free time!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Event Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Event for {selectedDate && format(selectedDate, "MMMM d, yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</label>
              <Input 
                type="date"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""} 
                onChange={e => {
                  const val = e.target.value;
                  if (val) {
                    const newDate = parseISO(val);
                    setSelectedDate(newDate);
                  }
                }} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</label>
              <Input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g., Midterm Exam" 
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["exam", "deadline", "meetup", "personal"] as EventType[]).map(type => (
                  <div
                    key={type}
                    onClick={() => setEventType(type)}
                    className={`flex items-center gap-2 p-3 text-sm font-medium border rounded-xl cursor-pointer transition-all ${
                      eventType === type 
                        ? EVENT_COLORS[type] + ' ring-1 ring-current' 
                        : 'border-border/40 hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    {EVENT_ICONS[type]}
                    <span className="capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Start Time
                </label>
                <Input 
                  type="time" 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> End Time
                </label>
                <Input 
                  type="time" 
                  value={endTime} 
                  onChange={e => setEndTime(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (Optional)</label>
              <Input 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Add details, links, or notes..." 
              />
            </div>
            
            <Button className="w-full mt-4" onClick={handleCreateEvent} disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Save Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <SyllabusImporter 
        open={isSyllabusModalOpen} 
        onOpenChange={setIsSyllabusModalOpen}
        onSuccess={fetchEvents}
      />
    </div>
  );
}
