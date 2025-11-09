import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

export function BudgetPage() {
  const categoryData = [
    { name: 'Rooms', value: 45000, color: '#0F6AB4' },
    { name: 'Resources', value: 35000, color: '#28A9A1' },
    { name: 'Speakers', value: 25000, color: '#8B5CF6' },
    { name: 'Other', value: 15000, color: '#F9B233' },
  ];

  const comparisonData = [
    { category: 'Venue', planned: 50000, actual: 45000 },
    { category: 'Catering', planned: 30000, actual: 35000 },
    { category: 'Technology', planned: 25000, actual: 25000 },
    { category: 'Marketing', planned: 20000, actual: 18000 },
    { category: 'Staff', planned: 15000, actual: 17000 },
  ];

  const totalPlanned = 140000;
  const totalActual = 120000;
  const remaining = totalPlanned - totalActual;
  const utilizationPercent = (totalActual / totalPlanned * 100).toFixed(1);
  const isOverBudget = totalActual > totalPlanned;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Budget Overview</h1>
        <p className="text-gray-600">Track and manage event expenses</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Budget</p>
            <h3 className="text-gray-900">LKR {totalPlanned.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Actual Cost</p>
            <h3 className="text-gray-900">LKR {totalActual.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Remaining</p>
            <h3 className="text-green-600">LKR {remaining.toLocaleString()}</h3>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">14% under budget</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Utilization</p>
            <h3 className="text-gray-900">{utilizationPercent}%</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-[#28A9A1] h-2 rounded-full"
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for budget status */}
      <Alert className="border-green-200 bg-green-50">
        <TrendingDown className="w-4 h-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ Budget is on track - you're under budget by LKR {remaining.toLocaleString()} ({(100 - parseFloat(utilizationPercent)).toFixed(1)}%)
        </AlertDescription>
      </Alert>

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
            <CardTitle>Planned vs Actual Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                planned: {
                  label: "Planned",
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
                  <Bar dataKey="planned" fill="#0F6AB4" name="Planned" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#28A9A1" name="Actual" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Cost Items */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Cost Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparisonData.map((item) => {
              const diff = item.actual - item.planned;
              const isOver = diff > 0;
              return (
                <div key={item.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-gray-900 mb-1">{item.category}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Planned: LKR {item.planned.toLocaleString()}</span>
                      <span>Actual: LKR {item.actual.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                    {isOver ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm">
                      {isOver ? '+' : ''}{diff.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
