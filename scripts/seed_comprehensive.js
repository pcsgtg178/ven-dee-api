import { pool } from '../src/config/db.js';

async function seedComprehensive() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing for clean seed
    await client.query('DELETE FROM swap_trail_nodes;');
    await client.query('DELETE FROM shift_swap_transactions;');
    await client.query('DELETE FROM shift_swap_logs;');
    await client.query('DELETE FROM customer_services;');
    await client.query('DELETE FROM service_todos;');
    await client.query('DELETE FROM appointments;');
    await client.query('DELETE FROM shift_todos;');
    await client.query('DELETE FROM shifts;');
    await client.query('DELETE FROM customers;');

    // 1. Customers
    const custs = [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        name: 'คุณยายสมศรี สุขเกษม',
        phone: '081-234-5678',
        note: 'บ้านสวน ซ.ร่วมใจ (คนไข้เบาหวาน เจาะน้ำตาล/ฉีดอินซูลิน)',
        address: '99/12 ซอยร่วมใจ 3 ถนนสุขุมวิท กรุงเทพฯ',
        avatarColor: 'bg-emerald-500'
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        name: 'คุณแพรวพรรณ โสภณ',
        phone: '089-876-5432',
        note: 'คอนโด Ashton อโศก ชั้น 18 (นัดดริปวิตามินผิวประจำสัปดาห์)',
        address: 'Ashton Asoke ห้อง 1804 สุขุมวิท 21 กรุงเทพฯ',
        avatarColor: 'bg-sky-500'
      },
      {
        id: 'c3333333-3333-3333-3333-333333333333',
        name: 'คุณเอกชัย วัฒนกุล',
        phone: '084-555-1234',
        note: 'หมู่บ้านพฤกษา 3 บางใหญ่ (ฉีดยาปฏิชีวนะตามคำสั่งแพทย์)',
        address: '45/88 หมู่บ้านพฤกษา 3 ซอย 5 นนทบุรี',
        avatarColor: 'bg-amber-500'
      },
      {
        id: 'c4444444-4444-4444-4444-444444444444',
        name: 'คุณหมอนิ่ม นิมิตรา',
        phone: '086-777-9890',
        note: 'รพ.จุฬาฯ ตึก ภปร (ฝากนำส่งอุปกรณ์เวชภัณฑ์ปลอดเชื้อ)',
        address: 'อาคาร ภปร ชั้น 5 รพ.จุฬาลงกรณ์',
        avatarColor: 'bg-purple-500'
      },
      {
        id: 'c5555555-5555-5555-5555-555555555555',
        name: 'คุณสมศรี วรรณดี',
        phone: '092-333-4455',
        note: 'ร้านขายยาหน้าหมู่บ้าน (คนละคนกับคุณยายสมศรี ซ.ร่วมใจ)',
        address: '12/4 หน้าปากซอยมิตรภาพ',
        avatarColor: 'bg-rose-500'
      }
    ];

    for (const c of custs) {
      await client.query(
        `INSERT INTO customers (id, name, phone, note, address, avatar_color)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [c.id, c.name, c.phone, c.note, c.address, c.avatarColor]
      );
    }

    // 2. Shifts (both shift_todos and shifts)
    const shiftsData = [
      { id: 'b0000001-0000-0000-0000-000000000001', date: '2026-09-19', shift: 'night', cat: 'black', status: 'active', dept: 'วอร์ด ICU ผู้ใหญ่', note: 'เวรดึกหลัก ดูแลเคส Post-Op', locked: false },
      { id: 'b0000002-0000-0000-0000-000000000002', date: '2026-09-20', shift: 'afternoon', cat: 'red', status: 'active', dept: 'ห้องฉุกเฉิน (ER)', note: 'ขึ้นเวร OT แทน ได้รับค่า OT', locked: false, swappedWith: 'พว.ก้อย สุดา', swapReason: 'ขึ้นเวรแทนเพื่อรับค่าตอบแทน OT' },
      { id: 'b0000003-0000-0000-0000-000000000003', date: '2026-09-21', shift: 'morning', cat: 'black', status: 'active', dept: 'อายุรกรรมหญิง ช.6', note: 'เวรเช้า (รับแลกต่อยอดมา)', locked: false, swappedWith: 'พว.กานดา สุวรรณ', origOwner: 'พว.วิภา มณีรัตน์', swapReason: 'พว.กานดาติดธุระด่วน จึงส่งต่อเวรให้ขึ้นแทน' },
      { id: 'b0000004-0000-0000-0000-000000000004', date: '2026-09-15', shift: 'morning', cat: 'black', status: 'active', dept: 'วอร์ด ICU ผู้ใหญ่', note: 'เวรเช้าที่ผ่านมาแล้วในอดีต', locked: true, swappedWith: 'พว.สมใจ อิ่มเอม', swapReason: 'แลกเวรล่วงหน้าเพื่อไปทำธุระ' },
      { id: 'b0000005-0000-0000-0000-000000000005', date: '2026-09-23', shift: 'night', cat: 'red', status: 'active', dept: 'วอร์ดกึ่งวิกฤต (Step Down)', note: 'เวร OT เพิ่มเติม', locked: false },
      { id: 'b0000006-0000-0000-0000-000000000006', date: '2026-09-01', shift: 'morning', cat: 'black', status: 'active', dept: 'วอร์ด ICU', note: 'เวรเช้า', locked: true },
      { id: 'b0000007-0000-0000-0000-000000000007', date: '2026-09-03', shift: 'afternoon', cat: 'black', status: 'active', dept: 'วอร์ด ICU', note: 'เวรบ่าย', locked: true },
      { id: 'b0000008-0000-0000-0000-000000000008', date: '2026-09-05', shift: 'night', cat: 'black', status: 'active', dept: 'วอร์ด ICU', note: 'เวรดึก', locked: true },
      { id: 'b0000009-0000-0000-0000-000000000009', date: '2026-09-07', shift: 'morning', cat: 'black', status: 'active', dept: 'วอร์ด ICU', note: 'เวรเช้า', locked: true },
      { id: 'b0000010-0000-0000-0000-000000000010', date: '2026-09-09', shift: 'afternoon', cat: 'black', status: 'active', dept: 'วอร์ด ICU', note: 'เวรบ่าย', locked: true },
      { id: 'b0000011-0000-0000-0000-000000000011', date: '2026-09-11', shift: 'night', cat: 'black', status: 'active', dept: 'วอร์ด ICU', note: 'เวรดึก', locked: true },
      { id: 'b0000012-0000-0000-0000-000000000012', date: '2026-09-13', shift: 'morning', cat: 'black', status: 'active', dept: 'วอร์ด ICU', note: 'เวรเช้า', locked: true },
      { id: 'b0000013-0000-0000-0000-000000000013', date: '2026-09-17', shift: 'morning', cat: 'black', status: 'active', dept: 'วอร์ด ICU', note: 'เวรเช้า', locked: true },
      { id: 'b0000014-0000-0000-0000-000000000014', date: '2026-09-25', shift: 'r1', cat: 'green', status: 'active', dept: 'ทีม Refer (Ambulance)', note: 'เวร R1 (ทีม 1) ทั้งวัน', locked: false },
      { id: 'b0000015-0000-0000-0000-000000000015', date: '2026-09-27', shift: 'morning', cat: 'black', status: 'active', dept: 'วอร์ด ICU', note: 'เวรเช้า', locked: false }
    ];

    for (const s of shiftsData) {
      await client.query(
        `INSERT INTO shift_todos (id, type, shift, date, category, status, is_locked, department, note, swapped_with, original_owner, swap_note)
         VALUES ($1, 'shift', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [s.id, s.shift, s.date, s.cat, s.status, s.locked, s.dept, s.note, s.swappedWith || null, s.origOwner || null, s.swapReason || null]
      );
      await client.query(
        `INSERT INTO shifts (id, shift_date, shift_type, category, status, department, note, is_locked, swapped_with, original_owner, swap_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [s.id, s.date, s.shift, s.cat, s.status, s.dept, s.note, s.locked, s.swappedWith || null, s.origOwner || null, s.swapReason || null]
      );
    }

    // 3. Customer Services
    const srvs = [
      {
        id: 'c5000001-0000-0000-0000-000000000001',
        custId: 'c1111111-1111-1111-1111-111111111111',
        date: '2026-09-19',
        time: '14:00',
        types: JSON.stringify(['injection']),
        meds: JSON.stringify(['Insulin Glargine 14 Units SC', 'Vitamin B1-6-12 1 Amp IM']),
        note: 'เจาะน้ำตาลปลายนิ้วก่อนฉีด (เป้าหมาย < 140 mg/dL)',
        status: 'upcoming',
        price: 450
      },
      {
        id: 'c5000002-0000-0000-0000-000000000002',
        custId: 'c2222222-2222-2222-2222-222222222222',
        date: '2026-09-20',
        time: '10:30',
        types: JSON.stringify(['drip']),
        meds: JSON.stringify([]),
        note: 'สูตร Aura Mega Bright + วิตามินซีเข้มข้น 500mg 1 ขวด',
        status: 'upcoming',
        price: 1500
      },
      {
        id: 'c5000003-0000-0000-0000-000000000003',
        custId: 'c3333333-3333-3333-3333-333333333333',
        date: '2026-09-18',
        time: '16:00',
        types: JSON.stringify(['injection']),
        meds: JSON.stringify(['Ceftriaxone 1g IV Pushช้าๆ 5 นาที']),
        note: 'เข็มที่ 4 จากคอร์ส 5 วัน คนไข้ไม่มีอาการแพ้',
        status: 'completed',
        price: 500
      },
      {
        id: 'c5000004-0000-0000-0000-000000000004',
        custId: 'c1111111-1111-1111-1111-111111111111',
        date: '2026-09-15',
        time: '16:30',
        types: JSON.stringify(['injection']),
        meds: JSON.stringify(['Insulin Glargine 14 Units SC']),
        note: 'เรียบร้อยดี ค่าน้ำตาล 124 mg/dL',
        status: 'completed',
        price: 450
      },
      {
        id: 'c5000005-0000-0000-0000-000000000005',
        custId: 'c4444444-4444-4444-4444-444444444444',
        date: '2026-09-22',
        time: '09:00',
        types: JSON.stringify(['delivery']),
        meds: JSON.stringify([]),
        note: 'นำส่งกล่อง Sterile Dressings Set จำนวน 5 เซต',
        status: 'upcoming',
        price: 300
      }
    ];

    for (const s of srvs) {
      await client.query(
        `INSERT INTO customer_services (id, customer_id, service_date, service_time, service_types, medications, note, status, price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [s.id, s.custId, s.date, s.time, s.types, s.meds, s.note, s.status, s.price]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Comprehensive database seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding comprehensive data:', err);
    throw err;
  } finally {
    client.release();
  }
}

seedComprehensive()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
