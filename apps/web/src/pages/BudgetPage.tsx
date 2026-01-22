import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { TrendingDown, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { BudgetLineTable } from '../components/budget/BudgetLineTable';
import { BudgetLineItem } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { KPICard } from '../components/dashboard/KPICard';
import { getEvent, getEvents, createBudgetItem, updateBudgetItem, deleteBudgetItem } from '../api';
import { Event } from '../types';

export function BudgetPage() {
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchBudget(selectedEventId);
    } else {
      setLineItems([]);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const { data } = await getEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        // Sort events by startDate descending (latest first) and select the latest
        const sortedEvents = [...data].sort((a, b) => {
          const dateA = new Date(a.startDate).getTime();
          const dateB = new Date(b.startDate).getTime();
          return dateB - dateA; // Descending order (latest first)
        });
        setSelectedEventId(sortedEvents[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to fetch events');
      console.error(error);
    }
  };

  // Helper function to map backend status to frontend display status
  const mapStatusToFrontend = (status: string): 'Planned' | 'Pending' | 'Paid' => {
    switch (status) {
      case 'PLANNED': return 'Planned';
      case 'APPROVED':
      case 'PURCHASED': return 'Pending';
      case 'PAID': return 'Paid';
      default: return 'Planned';
    }
  };

  // Helper function to map frontend status to backend status
  const mapStatusToBackend = (status: string): 'PLANNED' | 'APPROVED' | 'PURCHASED' | 'PAID' => {
    switch (status) {
      case 'Planned': return 'PLANNED';
      case 'Pending': return 'APPROVED'; // Frontend 'Pending' maps to 'APPROVED'
      case 'Paid': return 'PAID';
      default: return 'PLANNED';
    }
  };

  const fetchBudget = async (eventId: number) => {
    setLoading(true);
    try {
      const { data } = await getEvent(eventId);
      if (data.eventBudget?.items) {
        setLineItems(data.eventBudget.items.map((item: any) => ({
          id: item.id,
          category: item.category,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || '',
          estimatedCost: parseFloat(item.estimatedAmount || '0'),
          actualCost: parseFloat(item.actualAmount || '0'),
          vendor: item.vendor || '',
          status: mapStatusToFrontend(item.status || 'PLANNED'),
        })));
      } else {
        setLineItems([]);
      }
    } catch (error: any) {
      toast.error('Failed to fetch budget');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (item: Omit<BudgetLineItem, 'id'>) => {
    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }

    try {
      // Convert frontend format to API format
      const apiData = {
        category: item.category,
        description: item.description || undefined,
        estimatedAmount: (item.estimatedCost || 0).toString(),
        actualAmount: (item.actualCost || 0).toString(),
        quantity: item.quantity || 1,
        unit: item.unit || undefined,
        vendor: item.vendor || undefined,
        status: mapStatusToBackend(item.status || 'Planned'),
      };

      await createBudgetItem(selectedEventId, apiData);
      toast.success('Budget item added successfully');
      
      // Refresh budget data
      await fetchBudget(selectedEventId);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to add budget item';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleUpdateItem = async (id: number, updates: Partial<BudgetLineItem>) => {
    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }

    try {
      // Convert frontend format to API format
      const apiData: any = {};
      
      if (updates.category !== undefined) apiData.category = updates.category;
      if (updates.description !== undefined) apiData.description = updates.description;
      if (updates.estimatedCost !== undefined) apiData.estimatedAmount = updates.estimatedCost.toString();
      if (updates.actualCost !== undefined) apiData.actualAmount = updates.actualCost.toString();
      if (updates.quantity !== undefined) apiData.quantity = updates.quantity;
      if (updates.unit !== undefined) apiData.unit = updates.unit;
      if (updates.vendor !== undefined) apiData.vendor = updates.vendor;
      if (updates.status !== undefined) apiData.status = mapStatusToBackend(updates.status);

      await updateBudgetItem(selectedEventId, id, apiData);
      toast.success('Budget item updated successfully');
      
      // Refresh budget data
      await fetchBudget(selectedEventId);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to update budget item';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }

    if (!confirm('Are you sure you want to delete this budget item?')) {
      return;
    }

    try {
      await deleteBudgetItem(selectedEventId, id);
      toast.success('Budget item deleted successfully');
      
      // Refresh budget data
      await fetchBudget(selectedEventId);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete budget item';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const totalEstimated = lineItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
  const totalActual = lineItems.reduce((sum, item) => sum + (item.actualCost || 0), 0);
  const remaining = totalEstimated - totalActual;
  const utilizationPercent = totalEstimated > 0 ? (totalActual / totalEstimated * 100).toFixed(1) : '0';
  const variance = totalEstimated > 0 ? (((totalEstimated - totalActual) / totalEstimated) * 100).toFixed(1) : '0';

  const categoryData = lineItems.reduce((acc, item) => {
    const existing = acc.find(a => a.name === item.category);
    if (existing) {
      existing.value += item.actualCost || item.estimatedCost || 0;
    } else {
      acc.push({
        name: item.category,
        value: item.actualCost || item.estimatedCost || 0,
        color: getCategoryColor(item.category),
      });
    }
    return acc;
  }, [] as { name: string; value: number; color: string }[]);

  const comparisonData = lineItems.reduce((acc, item) => {
    const existing = acc.find(a => a.category === item.category);
    if (existing) {
      existing.planned += item.estimatedCost || 0;
      existing.actual += item.actualCost || 0;
    } else {
      acc.push({
        category: item.category,
        planned: item.estimatedCost || 0,
        actual: item.actualCost || 0,
      });
    }
    return acc;
  }, [] as { category: string; planned: number; actual: number }[]);

  function getCategoryColor(category: string): string {
    // Generate a consistent color based on category name hash
    // This ensures the same category always gets the same color
    if (!category) return '#6B7280';
    
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate a color from the hash (using HSL for better color distribution)
    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash) % 20); // 60-80% saturation
    const lightness = 45 + (Math.abs(hash) % 15); // 45-60% lightness
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Budget Overview</h1>
        <p className="text-gray-600">Track and manage event expenses</p>
      </div>

      {events.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="event-select">Select Event:</Label>
              <Select 
                value={selectedEventId?.toString() || ''} 
                onValueChange={(value) => setSelectedEventId(parseInt(value))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.title || event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedEventId && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard 
              title="Total Estimated"
              value={`LKR ${totalEstimated.toLocaleString()}`}
              icon={DollarSign}
              color="#0F6AB4"
            />
            <KPICard 
              title="Total Actual"
              value={`LKR ${totalActual.toLocaleString()}`}
              icon={DollarSign}
              color="#28A9A1"
            />
            <KPICard 
              title="Remaining"
              value={`LKR ${remaining.toLocaleString()}`}
              icon={DollarSign}
              color="#10B981"
              trend={`${variance}% ${parseFloat(variance) > 0 ? 'under' : 'over'} budget`}
            />
            <KPICard 
              title="Utilization"
              value={`${utilizationPercent}%`}
              icon={DollarSign}
              color="#F9B233"
              showProgress
              progressValue={parseFloat(utilizationPercent)}
            />
          </div>

          {/* Alert for budget status */}
          {remaining >= 0 ? (
            <Alert className="border-green-200 bg-green-50">
              <TrendingDown className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ Budget is on track - you're under budget by LKR {remaining.toLocaleString()} ({variance}%)
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-red-200 bg-red-50">
              <TrendingUp className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                ⚠️ Budget exceeded - you're over budget by LKR {Math.abs(remaining).toLocaleString()} ({Math.abs(parseFloat(variance))}%)
              </AlertDescription>
            </Alert>
          )}

          {/* Line Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <BudgetLineTable 
                  items={lineItems}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                />
              )}
            </CardContent>
          </Card>

          {lineItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donut Chart - Cost by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      value: {
                        label: "Amount",
                        color: "#0F6AB4",
                      },
                    }}
                    className="h-80"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {categoryData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-600">{item.name}</span>
                        <span className="text-sm ml-auto">LKR {item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart - Planned vs Actual */}
              <Card>
                <CardHeader>
                  <CardTitle>Estimated vs Actual Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      planned: {
                        label: "Estimated",
                        color: "#0F6AB4",
                      },
                      actual: {
                        label: "Actual",
                        color: "#28A9A1",
                      },
                    }}
                    className="h-80"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="planned" fill="#0F6AB4" name="Estimated" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actual" fill="#28A9A1" name="Actual" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {!selectedEventId && events.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No events available</h3>
            <p className="text-gray-600">Create an event first to view its budget</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
