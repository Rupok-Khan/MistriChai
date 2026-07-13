require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("./config/db");

const PASSWORD = "Partner@12345";
const partners = [
  ["Arif","Hossain","arif.partner@ondemand.com","01711001001","SEED-NID-1001","Dhaka","Savar","5","Savar Municipality","AC_REPAIR",7,"ODP201","1768378736695-440575089.png"],
  ["Mehedi","Hasan","mehedi.partner@ondemand.com","01711001002","SEED-NID-1002","Chattogram","Patiya","3","Patiya Municipality","PLUMBING",6,"ODP202","1768378776883-803622964.png"],
  ["Sabbir","Ahmed","sabbir.partner@ondemand.com","01711001003","SEED-NID-1003","Rajshahi","Paba","7","Paba Upazila","HOME_ELECTRONICS",8,"ODP203","1768378811864-945555703.png"],
  ["Imran","Khan","imran.partner@ondemand.com","01711001004","SEED-NID-1004","Khulna","Dumuria","4","Dumuria Upazila","GAS_STOVE_REPAIR",5,"ODP204","1768388511125-271743537.png"],
  ["Nayeem","Rahman","nayeem.partner@ondemand.com","01711001005","SEED-NID-1005","Sylhet","Sylhet Sadar","9","Sylhet City Corporation","HOME_CLEANING",4,"ODP205","1774349931263-804794118.jpg"]
];

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const [first,last,email,mobile,nid,district,thana,ward,area,category,experience,code,photo] of partners) {
      const [existing] = await connection.query("SELECT id FROM users WHERE email=? LIMIT 1", [email]);
      let userId = existing[0]?.id;
      if (!userId) {
        const [created] = await connection.query("INSERT INTO users (role,name,email,mobile,password_hash,is_active) VALUES ('PARTNER',?,?,?,?,1)", [`${first} ${last}`,email,mobile,passwordHash]);
        userId = created.insertId;
      } else {
        await connection.query("UPDATE users SET name=?,mobile=?,password_hash=?,is_active=1 WHERE id=?", [`${first} ${last}`,mobile,passwordHash,userId]);
      }
      await connection.query(`INSERT INTO partner_profiles
        (user_id,partner_code,first_name,last_name,nid_address,father_name,mother_name,nid_number,profile_photo,nid_front_photo,nid_back_photo,district,thana,ward_no,city_corp_or_union,technician_category,working_start_time,working_end_time,experience_years,verification_status,availability_status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'APPROVED','AVAILABLE')
        ON DUPLICATE KEY UPDATE partner_code=VALUES(partner_code),first_name=VALUES(first_name),last_name=VALUES(last_name),district=VALUES(district),thana=VALUES(thana),ward_no=VALUES(ward_no),city_corp_or_union=VALUES(city_corp_or_union),technician_category=VALUES(technician_category),experience_years=VALUES(experience_years),verification_status='APPROVED',availability_status='AVAILABLE'`,
        [userId,code,first,last,`${area}, ${district}`,"Demo Father","Demo Mother",nid,`/uploads/profile/${photo}`,"/uploads/nid/1768378736729-944185846.png","/uploads/nid/1768378736747-226112571.png",district,thana,ward,area,category,"09:00:00","20:00:00",experience]);
      await connection.query("INSERT IGNORE INTO partner_wallets (partner_user_id,balance) VALUES (?,0)", [userId]);
    }
    await connection.commit();
    console.log(`Seeded ${partners.length} approved partners. Shared password: ${PASSWORD}`);
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); await db.end(); }
}

seed().catch((error) => { console.error(error.message); process.exit(1); });
