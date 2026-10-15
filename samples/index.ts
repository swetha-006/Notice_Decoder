export interface SampleNotice {
  id: string;
  title: string;
  type: "scam" | "genuine";
  category: "tax" | "bank" | "customs" | "traffic";
  subtitle: string;
  content: string;
}

export const SAMPLES: SampleNotice[] = [
  {
    id: "tax-scam-upi",
    title: "Income Tax Demand Notice",
    type: "scam",
    category: "tax",
    subtitle: "Threatens arrest, demands personal UPI & links to lookalike domain",
    content: `[SAMPLE NOTICE — FICTIONAL FOR DEMONSTRATION ONLY]
GOVERNMENT OF INDIA - INCOME TAX DEPARTMENT
OFFICE OF THE TAX RECOVERY OFFICER, CIRCLE 12(1), NEW DELHI

Notice Reference: ITD/DEL/REC/2026/9821
Date of Issue: 14/10/2026

To,
Shri Rajesh Kumar Sharma
PAN: ABCDE1234F
Address: Flat 402, Green Park Apartments, New Delhi, PIN: 110016
Mobile: +91 9876543210
Email: rajesh.sharma99@gmail.com

FINAL DEMAND AND ATTACHMENT NOTICE BEFORE ARREST

Dear Rajesh Kumar Sharma,

Take notice that an outstanding income tax liability of Rs. 48,500/- (Rupees Forty-Eight Thousand Five Hundred only) is determined against your PAN ABCDE1234F for Assessment Year 2025-26.

Despite prior intimations, you have willfully defaulted. You are hereby ordered to deposit the full amount within 24 hours of receipt of this notice.

WARNING: If payment is not credited within 24 hours, an immediate warrant of arrest will be issued by the district magistrate, your Savings Bank Account No. 987654321098 at State Bank of India (IFSC: SBIN0001234) will be frozen, and criminal prosecution under non-bailable provisions will commence.

To avoid arrest and public property attachment, settle immediately via the official emergency recovery gateway:
Authorized UPI ID: incometax-refund@okaxis
Official Clearance Portal: http://incometax-gov.in/instant-settlement

For assistance, contact Recovery Officer: officer.taxdept@gmail.com

(Sd/-)
Recovery Officer, Tax Collection Wing`,
  },
  {
    id: "tax-genuine-143",
    title: "Income Tax Sec 143(1) Intimation",
    type: "genuine",
    category: "tax",
    subtitle: "Authentic intimation with valid DIN & incometax.gov.in guidance",
    content: `[SAMPLE NOTICE — FICTIONAL FOR DEMONSTRATION ONLY]
INCOME TAX DEPARTMENT - GOVERNMENT OF INDIA
CENTRALIZED PROCESSING CENTRE, BENGALURU 560500

DOCUMENT IDENTIFICATION NUMBER (DIN): ITBA/AST/S/143(1)/2025-26/1048291039
Communication Date: 10/10/2026

To,
Smt. Ananya Subramanian
PAN: BCDFE5678G
Address: 14/2, Gandhi Nagar, 4th Main Road, Adyar, Chennai, PIN Code: 600020
Mobile: +91 9444123456

INTIMATION UNDER SECTION 143(1) OF THE INCOME TAX ACT, 1961
Assessment Year: 2025-26 | e-Filing Ack No: 829104819201948

Dear Taxpayer,

The return of income filed by you for Assessment Year 2025-26 has been processed at the Centralized Processing Centre under Section 143(1) of the Income-tax Act, 1961.

Summary of Processing:
Total Income Returned by Taxpayer: Rs. 8,40,000/-
Total Income Computed under Section 143(1): Rs. 8,40,000/-
Taxes Paid (TDS & Advance Tax): Rs. 42,500/-
Net Amount Payable / Refundable: Rs. 0/- (Nil Demand / Nil Refund)

No further tax payment is required from your side. This communication is sent for your information and statutory compliance records.

IMPORTANT SECURITY NOTICE:
1. The Income Tax Department never requests taxpayers to transfer funds through UPI handles, gift cards, or personal accounts.
2. Tax payments can only be made through the authorized e-Pay Tax portal at https://eportal.incometax.gov.in using Challan ITNS 280.
3. You can authenticate the validity of this notice by entering the DIN on the official portal at https://eportal.incometax.gov.in under the 'Authenticate Notice/Order issued by ITD' tab.

Yours faithfully,
Assistant Commissioner of Income Tax, CPC Bengaluru
Email: notification@cpc.incometax.gov.in`,
  },
  {
    id: "bank-kyc-scam",
    title: "Bank KYC Account Block Warning",
    type: "scam",
    category: "bank",
    subtitle: "Urgent 12-hour freeze threat demanding unverified link update",
    content: `[SAMPLE NOTICE — FICTIONAL FOR DEMONSTRATION ONLY]
STATE BANK OF INDIA - URGENT SECURITY ALERT
SMS / NOTICE REFERENCE: SBI/KYC/URGENT/2026/4102
Date: 14/10/2026

Dear Customer Vikram Aditya Verma,

Your SBI Bank Account No. 10293847561 with CIF: 89201948 has been suspended due to overdue mandatory KYC verification.

As per Reserve Bank of India guidelines, all transactions, debit card services, and UPI access from your mobile number +91 9820123456 are blocked.

To prevent permanent account closure and transfer of balance to the inactive suspense account, you must update your PAN and Aadhaar within 12 hours.

CLICK HERE TO REACTIVATE YOUR SBI ACCOUNT IMMEDIATELY:
http://sbi-kyc-update.co.in/netbanking/login

Do not visit branch. Branch officers cannot unlock online accounts. Complete your biometric and Aadhaar OTP verification only at the portal above.

State Bank of India - Customer Care Wing
Helpdesk Email: sbikyc.support@yahoo.co.in`,
  },
  {
    id: "courier-customs",
    title: "Courier Airport Customs Fee Demand",
    type: "scam",
    category: "customs",
    subtitle: "Fake foreign contraband seizure demanding personal bank transfer",
    content: `[SAMPLE NOTICE — FICTIONAL FOR DEMONSTRATION ONLY]
INDIA POST INTERNATIONAL COURIER & CUSTOMS CLEARANCE WING
INDIRA GANDHI INTERNATIONAL AIRPORT CARGO COMPLEX, NEW DELHI

Notice Number: INPOST/CUST/PARCEL/2026/0912
Date: 14/10/2026

To Consignee:
Mr. Rohan Sen
Address: Sector 15, Vashi, Navi Mumbai, PIN Code: 400703
Mobile: +91 9930123456

SUBJECT: PARCEL HOLD NOTICE - IMPORT DUTY ASSESSMENT

Dear Rohan Sen,

An international parcel (Tracking ID: IN982019482GB) addressed to you originating from the United Kingdom has been seized by Airport Customs Division.

Upon scanning, the parcel was found to contain luxury goods, high-value electronics, and undeclared foreign currency exceeding permissible baggage rules.

A mandatory customs penalty and clearance fee of Rs. 24,500/- is assessed.

You are ordered to clear this penalty within 24 hours. Failure to remit payment will lead to immediate FIR registration by CBI/Customs Enforcement and your physical detention for smuggling undeclared foreign goods.

Pay the assessed customs fee immediately to the designated clearance agent account:
Beneficiary Account No: 50100492810291
IFSC: HDFC0000128
Or remit to Agent UPI ID: customs-clearance-desk@paytm

Send transaction screenshot via WhatsApp to Customs Agent on +91 9811223344.

Customs Officer (Air Cargo)
Email: airport.customs.clearance@gmail.com`,
  },
  {
    id: "echallan-scam",
    title: "Traffic Police E-Challan SMS",
    type: "scam",
    category: "traffic",
    subtitle: "Fake speeding fine with shortened bit.ly & lookalike links",
    content: `[SAMPLE NOTICE — FICTIONAL FOR DEMONSTRATION ONLY]
DELHI TRAFFIC POLICE - E-CHALLAN ENFORCEMENT WING
MoRTH AUTOMATED SURVEILLANCE NOTIFICATION

Challan Number: DL-CH-2026-891024
Vehicle Registration: DL 01 AB 1234
Notice Date: 14/10/2026

Dear Vehicle Owner Shri Amit Patel,

Your vehicle DL 01 AB 1234 was captured on high-speed CCTV at Outer Ring Road, New Delhi violating Speed Limit Regulation (102 km/h in 60 km/h zone) and Signal Jump.

A compound fine of Rs. 3,500/- is registered against your driving license.

WARNING: Settle within 24 hours to avoid court summons, permanent driving license suspension, and vehicle seizure.

Pay immediately and download your official clearance receipt from:
http://echallan-parivahan.in/pay-fine
Short link: https://bit.ly/echallan-quickpay

Do not contest at traffic booth. Only digital payment via the above portal is valid.

Delhi Traffic Police Headquarters,
Barakhamba Road, New Delhi
Support: challan.delhipolice@outlook.com`,
  },
  {
    id: "bank-genuine",
    title: "Bank Periodic KYC Update Reminder",
    type: "genuine",
    category: "bank",
    subtitle: "Legitimate customer advisory linking to official onlinesbi.sbi portal",
    content: `[SAMPLE NOTICE — FICTIONAL FOR DEMONSTRATION ONLY]
STATE BANK OF INDIA - PERIODIC CUSTOMER INFORMATION UPDATE
BRANCH: KORAMANGALA, BENGALURU | IFSC: SBIN0007890
Reference: SBI/BLR/KYC-REMINDER/2026/8920
Date: 10/10/2026

To,
Shri Karthik Natarajan
Savings Account No: 20192837465
Registered Address: 5th Cross, 1st Block, Koramangala, Bengaluru, PIN: 560034
Mobile: +91 9845012345

SUBJECT: ADVISORY REGARDING RE-KYC / CONTACT INFORMATION UPDATE

Dear Customer,

As part of the periodic customer due diligence mandated by Reserve Bank of India (RBI) regulations for active banking relationships, we invite you to review and confirm that your current contact address and identity credentials are up to date.

Notice Details & Advisory:
1. Please check your contact information and submit updated documents by 30/11/2026.
2. You may complete this verification conveniently through SBI NetBanking at the official secured portal: https://onlinesbi.sbi or via the SBI YONO mobile application.
3. Alternatively, you may submit self-attested photocopies of your valid identity and address proof at any State Bank of India branch of your choice.

SECURITY WARNING FROM SBI:
- State Bank of India will NEVER ask you to share your netbanking password, OTP, ATM PIN, or UPI PIN over phone, SMS, WhatsApp, or email.
- Never download remote desktop apps (such as AnyDesk, QuickSupport, or TeamViewer) or APK files sent via SMS.
- Always check the website address carefully. Our only genuine web portal is https://onlinesbi.sbi.

Yours faithfully,
Chief Manager (Customer Relations), SBI Koramangala Branch
Official Website: https://sbi.co.in
Customer Toll-Free: 1800 1234`,
  },
];
