import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { Users, Clock } from 'lucide-react';

function DraggableStaff({ staff }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `staff-${staff.user_id}`,
    data: { staff }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 bg-white border border-[#EBE5DB] rounded-lg mb-2 cursor-grab flex items-center gap-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="w-8 h-8 rounded-full bg-[#C9A84C] text-white flex items-center justify-center text-xs font-bold shrink-0">
        {staff.name ? staff.name.slice(0, 2).toUpperCase() : 'ST'}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#2D2D2D] truncate">{staff.name}</p>
        <p className="text-xs text-[#5C5C5C] truncate">{staff.role}</p>
      </div>
    </div>
  );
}

function DroppableShift({ shift }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `shift-${shift.shift_id}`,
    data: { shift }
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 border rounded-xl mb-3 transition-colors ${
        isOver ? 'bg-[#F5F0E8] border-[#C9A84C]' : 'bg-white border-[#EBE5DB]'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[#2D2D2D] truncate">{shift.role}</p>
          <p className="text-xs text-[#5C5C5C] flex items-center gap-1 mt-1">
            <Clock size={12} className="shrink-0" /> <span className="truncate">{shift.date} · {shift.start_time} - {shift.end_time}</span>
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 capitalize shrink-0 ml-2">
          {shift.status}
        </span>
      </div>
      
      <div className="mt-3 p-2 bg-[#F9F9F9] rounded border border-dashed border-[#CCCCCC] flex flex-wrap items-center gap-2">
        {shift.staff_name ? (
          <>
            <div className="w-6 h-6 rounded-full bg-[#4A7C59] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              {shift.staff_name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-[#2D2D2D] truncate">{shift.staff_name}</span>
          </>
        ) : (
          <span className="text-xs text-[#5C5C5C] italic">Drop staff here to assign</span>
        )}
      </div>
    </div>
  );
}

export default function PlannerBoard({ staffList, shiftsList, onAssignmentChange }) {
  const [activeId, setActiveId] = useState(null);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id.toString().startsWith('staff-') && over.id.toString().startsWith('shift-')) {
      const staffId = active.id.replace('staff-', '');
      const shiftId = over.id.replace('shift-', '');

      const assignedStaff = staffList.find(s => s.user_id === staffId);
      if (assignedStaff) {
        onAssignmentChange(shiftId, staffId, assignedStaff.name);
      }
    }
  };

  const activeStaffNode = activeId && activeId.toString().startsWith('staff-')
    ? staffList.find(s => `staff-${s.user_id}` === activeId)
    : null;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row gap-6 mt-2">
        {/* Staff Column */}
        <div className="w-full md:w-1/3 bg-[#F9F9F9] p-4 rounded-2xl border border-[#EBE5DB]">
          <h3 className="font-bold text-[#2D2D2D] mb-4 flex items-center gap-2" style={{fontFamily:'Playfair Display,serif'}}>
            <Users size={18} className="text-[#C9A84C]" /> Staff Directory
          </h3>
          <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {staffList.map(staff => (
              <DraggableStaff key={staff.user_id} staff={staff} />
            ))}
            {staffList.length === 0 && (
              <p className="text-sm text-[#5C5C5C] italic">No staff found.</p>
            )}
          </div>
        </div>

        {/* Shifts Column */}
        <div className="w-full md:w-2/3 bg-[#F9F9F9] p-4 rounded-2xl border border-[#EBE5DB]">
          <h3 className="font-bold text-[#2D2D2D] mb-4 flex items-center gap-2" style={{fontFamily:'Playfair Display,serif'}}>
            <Clock size={18} className="text-[#C9A84C]" /> Shift Timeline
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {shiftsList.map(shift => (
              <DroppableShift key={shift.shift_id} shift={shift} />
            ))}
            {shiftsList.length === 0 && (
              <div className="col-span-full text-center py-12 text-[#5C5C5C]">
                <Clock size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No shifts scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeStaffNode ? (
          <div className="p-3 bg-white border-2 border-[#C9A84C] rounded-lg shadow-xl flex items-center gap-3 opacity-90 cursor-grabbing w-64">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {activeStaffNode.name ? activeStaffNode.name.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2D2D2D] truncate">{activeStaffNode.name}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
