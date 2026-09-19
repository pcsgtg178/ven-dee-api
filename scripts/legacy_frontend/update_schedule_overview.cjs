const fs = require('fs');

const overviewPath = 'd:/ven-dee/ven-dee-app/app/components/ScheduleOverview.tsx';
let content = fs.readFileSync(overviewPath, 'utf8');

// 1. Add imports
const oldImports = `import ModalAddTodo from "./ModalAddTodo";
import ModalShiftSwap from "./ModalShiftSwap";
import ModalSwapTrail from "./ModalSwapTrail";`;

const newImports = `import ModalAddTodo from "./ModalAddTodo";
import ModalShiftSwap from "./ModalShiftSwap";
import ModalSwapTrail from "./ModalSwapTrail";
import ModalEditShift from "./ModalEditShift";
import ModalEditService from "./ModalEditService";`;

content = content.replace(oldImports, newImports);

// 2. Add states and handlers
const oldStateAnchor = `  // Date detail bottom sheet state
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [openDateDetailSheet, setOpenDateDetailSheet] = useState(false);`;

const newStateAnchor = `  // Date detail bottom sheet state
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [openDateDetailSheet, setOpenDateDetailSheet] = useState(false);

  // Edit Shift & Edit Service state
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [openEditShiftModal, setOpenEditShiftModal] = useState(false);

  const [editingService, setEditingService] = useState<CustomerServiceRecord | null>(null);
  const [openEditServiceModal, setOpenEditServiceModal] = useState(false);

  const handleEditShift = useCallback((shift: ShiftRecord) => {
    setEditingShift(shift);
    setOpenEditShiftModal(true);
  }, []);

  const handleEditService = useCallback((service: CustomerServiceRecord) => {
    setEditingService(service);
    setOpenEditServiceModal(true);
  }, []);`;

content = content.replace(oldStateAnchor, newStateAnchor);

// 3. Pass to ScheduleTodoListView
const oldListProps = `            onRequestUndoSwap={handleRequestUndoSwap}
            onRequestRestore={handleRequestRestore}
          />`;

const newListProps = `            onRequestUndoSwap={handleRequestUndoSwap}
            onRequestRestore={handleRequestRestore}
            onEditShift={handleEditShift}
            onEditService={handleEditService}
          />`;

content = content.replace(oldListProps, newListProps);

// 4. Pass to BottomSheet ActivityCard
const oldSheetCard = `            activitiesForSelectedDate.map((item) => (
              <ActivityCard
                key={item.id}
                item={item}
                onDelete={() => handleRequestDelete(item)}
                onToggleStatus={() => {
                  if (item.type === "service") {
                    handleToggleServiceStatus(item);
                  }
                }}
                onSwapShift={(shift) => handleInitiateSwap(shift)}
                onViewTrail={(shift) => handleViewTrail(shift)}
                onUndoSwap={(shift) => handleRequestUndoSwap(shift)}
                onRestoreShift={(shift) => handleRequestRestore(shift)}
              />
            ))`;

const newSheetCard = `            activitiesForSelectedDate.map((item) => (
              <ActivityCard
                key={item.id}
                item={item}
                onDelete={() => handleRequestDelete(item)}
                onToggleStatus={() => {
                  if (item.type === "service") {
                    handleToggleServiceStatus(item);
                  }
                }}
                onSwapShift={(shift) => handleInitiateSwap(shift)}
                onViewTrail={(shift) => handleViewTrail(shift)}
                onUndoSwap={(shift) => handleRequestUndoSwap(shift)}
                onRestoreShift={(shift) => handleRequestRestore(shift)}
                onEditShift={handleEditShift}
                onEditService={handleEditService}
              />
            ))`;

content = content.replace(oldSheetCard, newSheetCard);

// 5. Render ModalEditShift and ModalEditService before BottomNav
const oldModalsAnchor = `      {/* Bottom Navigation */}
      <BottomNav`;

const newModalsAnchor = `      {/* Modal Edit Shift */}
      <ModalEditShift
        shift={editingShift}
        isOpen={openEditShiftModal}
        onClose={() => {
          setOpenEditShiftModal(false);
          setEditingShift(null);
        }}
        onSuccess={() => {
          setToastMessage("บันทึกการแก้ไขเวรเรียบร้อยแล้ว");
          setTimeout(() => setToastMessage(null), 3500);
          reloadData();
        }}
      />

      {/* Modal Edit Customer Service */}
      <ModalEditService
        service={editingService}
        isOpen={openEditServiceModal}
        onClose={() => {
          setOpenEditServiceModal(false);
          setEditingService(null);
        }}
        onSuccess={() => {
          setToastMessage("บันทึกการแก้ไขนัดหมายเรียบร้อยแล้ว");
          setTimeout(() => setToastMessage(null), 3500);
          reloadData();
        }}
      />

      {/* Bottom Navigation */}
      <BottomNav`;

content = content.replace(oldModalsAnchor, newModalsAnchor);

fs.writeFileSync(overviewPath, content, 'utf8');
console.log('Successfully updated ScheduleOverview.tsx');
