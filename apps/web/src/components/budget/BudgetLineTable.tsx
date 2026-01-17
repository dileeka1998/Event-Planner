import { useState } from 'react';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { BudgetLineItem } from '../../types';

interface BudgetLineTableProps {
  items: BudgetLineItem[];
  onAddItem: (item: Omit<BudgetLineItem, 'id'>) => void;
  onUpdateItem: (id: number, item: Partial<BudgetLineItem>) => void;
  onDeleteItem: (id: number) => void;
}

export function BudgetLineTable({ items, onAddItem, onUpdateItem, onDeleteItem }: BudgetLineTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Omit<BudgetLineItem, 'id'>>({
    category: 'Other',
    description: '',
    quantity: 1,
    unit: 'item',
    estimatedCost: 0,
    actualCost: 0,
    vendor: '',
    status: 'Planned',
  });

  const handleSaveNew = () => {
    if (newItem.description) {
      onAddItem(newItem);
      setNewItem({
        category: 'Other',
        description: '',
        quantity: 1,
        unit: 'item',
        estimatedCost: 0,
        actualCost: 0,
        vendor: '',
        status: 'Planned',
      });
      setIsAdding(false);
    }
  };

  const getStatusColor = (status: BudgetLineItem['status']) => {
    switch (status) {
      case 'Paid': return 'bg-green-500';
      case 'Pending': return 'bg-[#F9B233]';
      case 'Planned': return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-gray-900">Line Items</h3>
        <Button 
          onClick={() => setIsAdding(true)}
          className="bg-[#0F6AB4] hover:bg-[#0D5A9A]"
          disabled={isAdding}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 text-sm text-gray-600">Category</th>
              <th className="text-left p-3 text-sm text-gray-600">Description</th>
              <th className="text-left p-3 text-sm text-gray-600">Qty</th>
              <th className="text-left p-3 text-sm text-gray-600">Unit</th>
              <th className="text-left p-3 text-sm text-gray-600">Estimated</th>
              <th className="text-left p-3 text-sm text-gray-600">Actual</th>
              <th className="text-left p-3 text-sm text-gray-600">Vendor</th>
              <th className="text-left p-3 text-sm text-gray-600">Status</th>
              <th className="text-left p-3 text-sm text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="border-b border-gray-200 bg-blue-50">
                <td className="p-2">
                  <Select value={newItem.category} onValueChange={(value: any) => setNewItem({ ...newItem, category: value })}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Venue">Venue</SelectItem>
                      <SelectItem value="Catering">Catering</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <Input 
                    value={newItem.description} 
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Description"
                    className="bg-white"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    type="number" 
                    value={newItem.quantity} 
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                    className="w-20 bg-white"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    value={newItem.unit} 
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    placeholder="Unit"
                    className="w-24 bg-white"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    type="number" 
                    value={newItem.estimatedCost} 
                    onChange={(e) => setNewItem({ ...newItem, estimatedCost: parseFloat(e.target.value) || 0 })}
                    className="w-28 bg-white"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    type="number" 
                    value={newItem.actualCost} 
                    onChange={(e) => setNewItem({ ...newItem, actualCost: parseFloat(e.target.value) || 0 })}
                    className="w-28 bg-white"
                  />
                </td>
                <td className="p-2">
                  <Input 
                    value={newItem.vendor} 
                    onChange={(e) => setNewItem({ ...newItem, vendor: e.target.value })}
                    placeholder="Vendor"
                    className="bg-white"
                  />
                </td>
                <td className="p-2">
                  <Select value={newItem.status} onValueChange={(value: any) => setNewItem({ ...newItem, status: value })}>
                    <SelectTrigger className="bg-white w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Planned">Planned</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleSaveNew} className="bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3 text-sm text-gray-900">{item.category}</td>
                <td className="p-3 text-sm text-gray-900">{item.description}</td>
                <td className="p-3 text-sm text-gray-900">{item.quantity}</td>
                <td className="p-3 text-sm text-gray-600">{item.unit}</td>
                <td className="p-3 text-sm text-gray-900">LKR {item.estimatedCost.toLocaleString()}</td>
                <td className="p-3 text-sm">
                  <Input 
                    type="number" 
                    value={item.actualCost}
                    onChange={(e) => onUpdateItem(item.id, { actualCost: parseFloat(e.target.value) || 0 })}
                    className="w-28"
                  />
                </td>
                <td className="p-3 text-sm text-gray-600">{item.vendor || '-'}</td>
                <td className="p-3">
                  <Badge className={`${getStatusColor(item.status)} text-white text-xs`}>
                    {item.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => onDeleteItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
