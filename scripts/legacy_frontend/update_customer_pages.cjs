const fs = require('fs');

// ============================================================================
// 1. Update app/customers/page.tsx
// ============================================================================
const custPagePath = 'd:/ven-dee/ven-dee-app/app/customers/page.tsx';
let custPageContent = fs.readFileSync(custPagePath, 'utf8');

// Add Pencil to imports
if (!custPageContent.includes('Pencil,')) {
  custPageContent = custPageContent.replace(
    '  UserPlus,\n',
    '  UserPlus,\n  Pencil,\n'
  );
}

// Add ModalEditCustomer import
if (!custPageContent.includes('ModalEditCustomer')) {
  custPageContent = custPageContent.replace(
    'import ModalAddTodo from "../components/ModalAddTodo";',
    'import ModalAddTodo from "../components/ModalAddTodo";\nimport ModalEditCustomer from "../components/ModalEditCustomer";'
  );
}

// Add editingCustomer state
const oldCustStates = `  const [openNewCustomerModal, setOpenNewCustomerModal] = useState(false);`;
const newCustStates = `  const [openNewCustomerModal, setOpenNewCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [openEditCustomerModal, setOpenEditCustomerModal] = useState(false);`;

custPageContent = custPageContent.replace(oldCustStates, newCustStates);

// Update action bar of each Customer Card
const oldCardActions = `                  {/* ปุ่มเพิ่มนัดหมายลูกค้า: เปิด ModalAddTodo ในส่วน [ บริการลูกค้า ] พร้อมกับส่ง id ลูกค้าไปให้ด้วย */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenAddService(cust.id, e)}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary-light px-3 py-1.5 text-xs font-bold text-primary-dark hover:bg-emerald-100 active:scale-95 dark:bg-primary-dark/40 dark:text-primary-light transition-all shadow-2xs border border-primary/20"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    <span>+ นัดหมายบริการ</span>
                  </button>`;

const newCardActions = `                  {/* Actions: ปุ่มแก้ไขลูกค้า + ปุ่มเพิ่มนัดหมาย */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingCustomer(cust);
                        setOpenEditCustomerModal(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-surface-subtle px-2.5 py-1.5 text-xs font-bold text-text-main hover:bg-slate-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-200 transition-all border border-surface-subtle dark:border-zinc-700"
                      title="แก้ไขข้อมูลลูกค้า"
                    >
                      <Pencil className="h-3.5 w-3.5 text-secondary" />
                      <span>แก้ไข</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleOpenAddService(cust.id, e)}
                      className="inline-flex items-center gap-1 rounded-xl bg-primary-light px-3 py-1.5 text-xs font-bold text-primary-dark hover:bg-emerald-100 active:scale-95 dark:bg-primary-dark/40 dark:text-primary-light transition-all shadow-2xs border border-primary/20"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      <span>+ นัดหมายบริการ</span>
                    </button>
                  </div>`;

custPageContent = custPageContent.replace(oldCardActions, newCardActions);

// Render ModalEditCustomer before end of CustomersPage
const oldModalAddTodoCust = `      {/* Modal Add Todo (Customer Service with preselected ID) */}
      <ModalAddTodo`;

const newModalEditCustomerCust = `      {/* Modal Edit Customer */}
      <ModalEditCustomer
        customer={editingCustomer}
        isOpen={openEditCustomerModal}
        onClose={() => {
          setOpenEditCustomerModal(false);
          setEditingCustomer(null);
        }}
        onSuccess={() => {
          reloadData();
        }}
      />

      {/* Modal Add Todo (Customer Service with preselected ID) */}
      <ModalAddTodo`;

custPageContent = custPageContent.replace(oldModalAddTodoCust, newModalEditCustomerCust);

fs.writeFileSync(custPagePath, custPageContent, 'utf8');
console.log('Successfully updated app/customers/page.tsx');

// ============================================================================
// 2. Update app/customers/[id]/page.tsx
// ============================================================================
const custDetailPagePath = 'd:/ven-dee/ven-dee-app/app/customers/[id]/page.tsx';
let custDetailContent = fs.readFileSync(custDetailPagePath, 'utf8');

// Add Pencil to imports
if (!custDetailContent.includes('Pencil,')) {
  custDetailContent = custDetailContent.replace(
    '  Phone,\n',
    '  Phone,\n  Pencil,\n'
  );
}

// Add canEditService to storage imports
if (!custDetailContent.includes('canEditService')) {
  custDetailContent = custDetailContent.replace(
    '  getCustomerById,\n',
    '  getCustomerById,\n  canEditService,\n'
  );
}

// Add ModalEditCustomer and ModalEditService imports
if (!custDetailContent.includes('ModalEditCustomer')) {
  custDetailContent = custDetailContent.replace(
    'import ModalAddTodo from "../../components/ModalAddTodo";',
    'import ModalAddTodo from "../../components/ModalAddTodo";\nimport ModalEditCustomer from "../../components/ModalEditCustomer";\nimport ModalEditService from "../../components/ModalEditService";'
  );
}

// Add states for edit customer and edit service
const oldDetailStates = `  // Modal
  const [openAddModal, setOpenAddModal] = useState(false);`;

const newDetailStates = `  // Modals
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditCustomerModal, setOpenEditCustomerModal] = useState(false);
  const [editingService, setEditingService] = useState<CustomerServiceRecord | null>(null);
  const [openEditServiceModal, setOpenEditServiceModal] = useState(false);

  const handleEditService = (srv: CustomerServiceRecord) => {
    setEditingService(srv);
    setOpenEditServiceModal(true);
  };`;

custDetailContent = custDetailContent.replace(oldDetailStates, newDetailStates);

// Update Customer Profile quick actions row
const oldQuickActions = `          {/* Quick Actions Row: Call button + Add Appointment */}
          <div className="mt-4 flex items-center gap-2 border-t border-surface-subtle pt-3 dark:border-zinc-800">
            {customer.phone && customer.phone !== "-" ? (
              <a
                href={\`tel:\${customer.phone}\`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-subtle py-2.5 text-xs font-bold text-text-main hover:bg-primary-light hover:text-primary-dark active:scale-95 dark:bg-zinc-800 dark:text-zinc-200 transition-all"
              >
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span>โทรติดต่อ ({customer.phone})</span>
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => setOpenAddModal(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              <span>+ นัดหมายรอบใหม่</span>
            </button>
          </div>`;

const newQuickActions = `          {/* Quick Actions Row: Call button + Edit Customer + Add Appointment */}
          <div className="mt-4 flex items-center gap-2 border-t border-surface-subtle pt-3 dark:border-zinc-800">
            {customer.phone && customer.phone !== "-" ? (
              <a
                href={\`tel:\${customer.phone}\`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-subtle py-2.5 text-xs font-bold text-text-main hover:bg-primary-light hover:text-primary-dark active:scale-95 dark:bg-zinc-800 dark:text-zinc-200 transition-all"
              >
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span>โทรติดต่อ</span>
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => setOpenEditCustomerModal(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-surface-subtle bg-surface-subtle py-2.5 text-xs font-bold text-text-main hover:bg-slate-200 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition-all"
            >
              <Pencil className="h-3.5 w-3.5 text-secondary" />
              <span>แก้ไขข้อมูล</span>
            </button>

            <button
              type="button"
              onClick={() => setOpenAddModal(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              <span>+ นัดหมาย</span>
            </button>
          </div>`;

custDetailContent = custDetailContent.replace(oldQuickActions, newQuickActions);

// Pass onEdit to ServiceDetailCard in both upcoming and history lists
custDetailContent = custDetailContent.replaceAll(
  '<ServiceDetailCard\n                  key={srv.id}\n                  service={srv}\n                  onToggleStatus={() => handleToggleStatus(srv)}\n                  onDelete={() => deleteService(srv.id)}\n                />',
  '<ServiceDetailCard\n                  key={srv.id}\n                  service={srv}\n                  onToggleStatus={() => handleToggleStatus(srv)}\n                  onDelete={() => deleteService(srv.id)}\n                  onEdit={() => handleEditService(srv)}\n                />'
);

// Add ModalEditCustomer and ModalEditService before BottomNav
const oldDetailBottomNav = `      {/* Modal Add Todo (Customer Service with this customer preselected) */}
      <ModalAddTodo`;

const newDetailModals = `      {/* Modal Edit Customer */}
      <ModalEditCustomer
        customer={customer}
        isOpen={openEditCustomerModal}
        onClose={() => setOpenEditCustomerModal(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Modal Edit Service */}
      <ModalEditService
        service={editingService}
        isOpen={openEditServiceModal}
        onClose={() => {
          setOpenEditServiceModal(false);
          setEditingService(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Modal Add Todo (Customer Service with this customer preselected) */}
      <ModalAddTodo`;

custDetailContent = custDetailContent.replace(oldDetailBottomNav, newDetailModals);

// Update ServiceDetailCardProps and ServiceDetailCard component
const oldServiceDetailCardProps = `interface ServiceDetailCardProps {
  service: CustomerServiceRecord;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function ServiceDetailCard({
  service,
  onToggleStatus,
  onDelete,
}: ServiceDetailCardProps) {
  const isCompleted = service.status === "completed";`;

const newServiceDetailCardProps = `interface ServiceDetailCardProps {
  service: CustomerServiceRecord;
  onToggleStatus: () => void;
  onDelete: () => void;
  onEdit?: () => void;
}

function ServiceDetailCard({
  service,
  onToggleStatus,
  onDelete,
  onEdit,
}: ServiceDetailCardProps) {
  const isCompleted = service.status === "completed";
  const canEdit = canEditService(service);`;

custDetailContent = custDetailContent.replace(oldServiceDetailCardProps, newServiceDetailCardProps);

// In ServiceDetailCard: add pencil edit button next to delete button
const oldDetailDeleteBtn = `        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
          title="ลบรายการนี้"
        >
          <Trash2 className="h-4 w-4" />
        </button>`;

const newDetailDeleteBtn = `        {/* Action Buttons: Edit + Delete */}
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-teal-600 active:scale-95 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-all"
              title="แก้ไขนัดหมายนี้"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:hover:bg-rose-950/40 transition-colors"
            title="ลบรายการนี้"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>`;

custDetailContent = custDetailContent.replace(oldDetailDeleteBtn, newDetailDeleteBtn);

fs.writeFileSync(custDetailPagePath, custDetailContent, 'utf8');
console.log('Successfully updated app/customers/[id]/page.tsx');

// ============================================================================
// 3. Create app/customers/[id]/edit/page.tsx
// ============================================================================
const editCustomerPageDir = 'd:/ven-dee/ven-dee-app/app/customers/[id]/edit';
if (!fs.existsSync(editCustomerPageDir)) {
  fs.mkdirSync(editCustomerPageDir, { recursive: true });
}

const editCustomerPageCode = `"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { User, Phone, Tag, MapPin, Check, AlertCircle, ArrowLeft } from "lucide-react";
import AppBar from "../../../components/AppBar";
import BottomNav from "../../../components/BottomNav";
import { Customer } from "../../../../types/vendee";
import { getCustomerById, saveCustomer } from "../../../../lib/storage";

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | undefined>(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (customerId) {
      const cust = getCustomerById(customerId);
      if (cust) {
        setCustomer(cust);
        setName(cust.name || "");
        setPhone(cust.phone === "-" ? "" : cust.phone || "");
        setNote(cust.note || "");
        setAddress(cust.address || "");
      }
    }
  }, [customerId]);

  if (!customer) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
        <AppBar title="แก้ไขข้อมูลลูกค้า" showBack backHref="/customers" />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mb-3" />
          <h2 className="text-base font-bold">ไม่พบข้อมูลลูกค้า</h2>
        </main>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("กรุณากรอกชื่อ-นามสกุลลูกค้า");
      return;
    }

    try {
      saveCustomer({
        id: customer.id,
        name: name.trim(),
        phone: phone.trim() || "-",
        note: note.trim() || "ลูกค้าทั่วไป",
        address: address.trim() || undefined,
        avatarColor: customer.avatarColor,
        createdAt: customer.createdAt,
      });

      router.push(\`/customers/\${customer.id}\`);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-text-main dark:bg-zinc-950 dark:text-zinc-100 pb-20">
      <AppBar
        title="แก้ไขข้อมูลลูกค้า"
        showBack
        backHref={\`/customers/\${customer.id}\`}
      />

      <main className="mx-auto w-full max-w-lg flex-1 p-4 space-y-4">
        {/* Customer Header Preview */}
        <div className="flex items-center gap-3 rounded-2xl border border-surface-subtle bg-card-bg p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div
            className={\`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-xs \${
              customer.avatarColor || "bg-primary"
            }\`}
          >
            {customer.name.substring(0, 2)}
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-main dark:text-white">
              {customer.name}
            </h2>
            <p className="text-xs text-text-muted dark:text-zinc-400">
              รหัสลูกค้า: {customer.id}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-3xl border border-surface-subtle bg-card-bg p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-text-main dark:text-zinc-200">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>ชื่อ-นามสกุลลูกค้า <strong className="text-rose-500">*</strong></span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ระบุชื่อจริง นามสกุล หรือชื่อเรียก"
                className="w-full rounded-xl border border-surface-subtle bg-surface-subtle/40 px-3.5 py-2.5 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary-light dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-text-main dark:text-zinc-200">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span>เบอร์โทรศัพท์ติดต่อ</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="w-full rounded-xl border border-surface-subtle bg-surface-subtle/40 px-3.5 py-2.5 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary-light dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white"
              />
            </div>

            {/* Distinctive Note */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-text-main dark:text-zinc-200">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span>จุดสังเกต / Note กำกับ <strong className="text-rose-500">*</strong></span>
              </label>
              <input
                type="text"
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น ซอย 5 (บ้านสีฟ้า), ชั้น 18, ตรวจแผลหลังผ่า"
                className="w-full rounded-xl border border-surface-subtle bg-surface-subtle/40 px-3.5 py-2.5 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary-light dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white"
              />
              <p className="text-[11px] text-text-muted dark:text-zinc-400">
                * ใช้สำหรับแยกแยะกรณีลูกค้ามีชื่อ-นามสกุลซ้ำกัน
              </p>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-text-main dark:text-zinc-200">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>ที่อยู่ / พิกัดบริการ (ไม่บังคับ)</span>
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ระบุบ้านเลขที่ ซอย หรือจุดสังเกตสถานที่"
                className="w-full rounded-xl border border-surface-subtle bg-surface-subtle/40 px-3.5 py-2 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary-light dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-surface-subtle dark:border-zinc-800">
              <button
                type="button"
                onClick={() => router.push(\`/customers/\${customer.id}\`)}
                className="flex-1 rounded-xl border border-surface-subtle bg-surface-subtle py-2.5 text-xs font-bold text-text-main hover:bg-slate-200 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
              >
                <Check className="h-4 w-4" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
`;

fs.writeFileSync('d:/ven-dee/ven-dee-app/app/customers/[id]/edit/page.tsx', editCustomerPageCode, 'utf8');
console.log('Created app/customers/[id]/edit/page.tsx');
