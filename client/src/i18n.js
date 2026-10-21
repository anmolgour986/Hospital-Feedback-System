import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English text is used as the key, so a missing Hindi entry simply falls back to English.
const hi = {
  // general
  'Dashboard': 'डैशबोर्ड', 'Give Feedback': 'फीडबैक दें', 'My Feedback': 'मेरे फीडबैक', 'Feedback': 'फीडबैक', 'Complaints': 'शिकायतें',
  'Service Requests': 'सेवा अनुरोध', 'Notifications': 'सूचनाएं', 'Profile': 'प्रोफ़ाइल', 'Analytics': 'विश्लेषण', 'Performance': 'प्रदर्शन',
  'Reports': 'रिपोर्ट', 'Users': 'उपयोगकर्ता', 'Departments': 'विभाग', 'QR Codes': 'क्यूआर कोड', 'Security': 'सुरक्षा', 'More': 'और',
  'Logout': 'लॉग आउट', 'Login': 'लॉग इन', 'Sign in': 'साइन इन', 'Register': 'पंजीकरण', 'Create account': 'खाता बनाएं', 'Home': 'होम',
  'Hospital Feedback': 'अस्पताल फीडबैक', 'Patient Feedback & Service Management': 'रोगी फीडबैक एवं सेवा प्रबंधन',
  'Welcome back': 'वापसी पर स्वागत है', 'Hello': 'नमस्ते', 'Loading...': 'लोड हो रहा है...', 'Save': 'सहेजें', 'Cancel': 'रद्द करें',
  'Submit': 'जमा करें', 'Edit': 'संपादित करें', 'Delete': 'हटाएं', 'Close': 'बंद करें', 'Back': 'वापस', 'Search': 'खोजें', 'Filters': 'फ़िल्टर',
  'Clear filters': 'फ़िल्टर हटाएं', 'All': 'सभी', 'Apply': 'लागू करें', 'Yes': 'हां', 'No': 'नहीं', 'Next': 'अगला', 'Previous': 'पिछला',
  'Page {{page}} of {{pages}}': 'पृष्ठ {{page}} / {{pages}}', 'No results found': 'कोई परिणाम नहीं मिला', 'Nothing here yet': 'अभी कुछ नहीं है',
  'Refresh': 'रीफ्रेश', 'View': 'देखें', 'View all': 'सभी देखें', 'Actions': 'कार्य', 'Name': 'नाम', 'Email': 'ईमेल', 'Phone': 'फ़ोन',
  'Password': 'पासवर्ड', 'Role': 'भूमिका', 'Status': 'स्थिति', 'Priority': 'प्राथमिकता', 'Category': 'श्रेणी', 'Department': 'विभाग',
  'Description': 'विवरण', 'Title': 'शीर्षक', 'Date': 'तारीख', 'Location': 'स्थान', 'Type': 'प्रकार', 'Language': 'भाषा', 'Optional': 'वैकल्पिक',
  // auth
  'Email address': 'ईमेल पता', 'Full name': 'पूरा नाम', 'Phone number': 'फ़ोन नंबर', 'Confirm password': 'पासवर्ड की पुष्टि करें',
  'Forgot password?': 'पासवर्ड भूल गए?', 'New here?': 'नए हैं?', 'Already have an account?': 'पहले से खाता है?',
  'Reset password': 'पासवर्ड रीसेट करें', 'Send reset link': 'रीसेट लिंक भेजें', 'Back to login': 'लॉगिन पर वापस',
  'New password': 'नया पासवर्ड', 'Current password': 'वर्तमान पासवर्ड', 'Change password': 'पासवर्ड बदलें', 'Passwords do not match': 'पासवर्ड मेल नहीं खाते',
  'At least 8 characters with a letter and a number': 'कम से कम 8 अक्षर, एक अक्षर और एक अंक के साथ',
  'Demo accounts': 'डेमो खाते', 'Tap to fill': 'भरने के लिए टैप करें', 'Enter your email and we will send you a reset link.': 'अपना ईमेल दर्ज करें, हम रीसेट लिंक भेजेंगे।',
  'Choose a new password for your account.': 'अपने खाते के लिए नया पासवर्ड चुनें।', 'Password updated': 'पासवर्ड अपडेट हो गया',
  'Account created': 'खाता बन गया', 'Logged in': 'लॉग इन हो गया',
  // roles
  'patient': 'रोगी', 'staff': 'स्टाफ', 'admin': 'एडमिन', 'Patient': 'रोगी', 'Staff': 'स्टाफ', 'Admin': 'एडमिन',
  // dashboards
  'Your health, your voice': 'आपका स्वास्थ्य, आपकी आवाज़', 'Quick actions': 'त्वरित कार्य', 'Recent complaints': 'हाल की शिकायतें',
  'Recent requests': 'हाल के अनुरोध', 'Recent notifications': 'हाल की सूचनाएं', 'Feedback given': 'दिए गए फीडबैक', 'Open complaints': 'खुली शिकायतें',
  'Resolved complaints': 'सुलझी शिकायतें', 'Active requests': 'सक्रिय अनुरोध', 'Register a complaint': 'शिकायत दर्ज करें', 'New service request': 'नया सेवा अनुरोध',
  'My assigned complaints': 'मुझे सौंपी गई शिकायतें', 'Unassigned in my department': 'मेरे विभाग में अनसौंपी', 'Pending requests': 'लंबित अनुरोध',
  'My rating': 'मेरी रेटिंग', 'Resolution rate': 'समाधान दर', 'Avg resolution time': 'औसत समाधान समय', 'Patient satisfaction': 'रोगी संतुष्टि',
  'Satisfaction score': 'संतुष्टि स्कोर', 'Average rating': 'औसत रेटिंग', 'Total feedback': 'कुल फीडबैक', 'Total complaints': 'कुल शिकायतें',
  'Escalated': 'एस्केलेट की गई', 'Overdue': 'देर से', 'Urgent open': 'तत्काल (खुली)', 'Needs attention': 'ध्यान चाहिए', 'Attention needed': 'ध्यान आवश्यक',
  'Feedback trend': 'फीडबैक रुझान', 'Complaints by status': 'स्थिति के अनुसार शिकायतें', 'Complaints by category': 'श्रेणी के अनुसार शिकायतें',
  'Complaints by priority': 'प्राथमिकता के अनुसार शिकायतें', 'Sentiment analysis': 'भावना विश्लेषण', 'Rating distribution': 'रेटिंग वितरण',
  'Department ratings': 'विभाग रेटिंग', 'Last 7 days': 'पिछले 7 दिन', 'Last 30 days': 'पिछले 30 दिन', 'Last 90 days': 'पिछले 90 दिन', 'Last year': 'पिछला वर्ष',
  'Daily': 'दैनिक', 'Weekly': 'साप्ताहिक', 'Monthly': 'मासिक', 'Positive': 'सकारात्मक', 'Neutral': 'तटस्थ', 'Negative': 'नकारात्मक',
  'positive': 'सकारात्मक', 'neutral': 'तटस्थ', 'negative': 'नकारात्मक', 'Feedback received': 'प्राप्त फीडबैक', 'Complaints raised': 'दर्ज शिकायतें',
  'Complaints resolved': 'सुलझाई गई शिकायतें', 'Avg rating': 'औसत रेटिंग', 'Run escalation check now': 'अभी एस्केलेशन जांच चलाएं',
  // feedback
  'Share your experience': 'अपना अनुभव साझा करें', 'Select department': 'विभाग चुनें', 'Doctor / staff member (optional)': 'डॉक्टर / स्टाफ (वैकल्पिक)',
  'Rate the doctor / staff': 'डॉक्टर / स्टाफ को रेटिंग दें', 'Overall experience': 'कुल अनुभव', 'Your comments': 'आपकी टिप्पणियां',
  'Tell us what went well or what we can improve': 'बताएं क्या अच्छा रहा या क्या सुधार हो सकता है', 'Visit type': 'विज़िट का प्रकार',
  'Submit anonymously': 'गुमनाम रूप से जमा करें', 'Your identity will be hidden from staff and admin': 'आपकी पहचान स्टाफ और एडमिन से छिपी रहेगी',
  'Thank you for your feedback!': 'आपके फीडबैक के लिए धन्यवाद!', 'Submit another': 'एक और जमा करें', 'Poor': 'खराब', 'Fair': 'ठीक-ठाक', 'Good': 'अच्छा',
  'Very good': 'बहुत अच्छा', 'Excellent': 'उत्कृष्ट', 'Please select a department': 'कृपया विभाग चुनें', 'Please give a star rating': 'कृपया स्टार रेटिंग दें',
  'Anonymous': 'गुमनाम', 'Scan & share feedback': 'स्कैन करें और फीडबैक दें', 'No doctor / staff': 'कोई डॉक्टर / स्टाफ नहीं',
  'Feedback history': 'फीडबैक इतिहास', 'All ratings': 'सभी रेटिंग', 'All sentiments': 'सभी भावनाएं', 'All departments': 'सभी विभाग',
  'Search comments': 'टिप्पणियां खोजें', 'Via QR': 'क्यूआर से', 'Staff rating': 'स्टाफ रेटिंग', 'Delete this feedback?': 'यह फीडबैक हटाएं?',
  // complaints
  'New complaint': 'नई शिकायत', 'Complaint details': 'शिकायत विवरण', 'Describe the problem': 'समस्या बताएं', 'Short title': 'संक्षिप्त शीर्षक',
  'Category and sentiment are detected automatically': 'श्रेणी और भावना अपने-आप पहचानी जाती हैं', 'Auto-detect': 'स्वतः पहचानें',
  'Complaint registered': 'शिकायत दर्ज हो गई', 'Assigned to': 'सौंपा गया', 'Unassigned': 'अनसौंपी', 'Assign': 'सौंपें', 'Assign to staff': 'स्टाफ को सौंपें',
  'Claim this complaint': 'यह शिकायत लें', 'Update status': 'स्थिति अपडेट करें', 'Change priority': 'प्राथमिकता बदलें', 'Reply': 'उत्तर दें',
  'Write a message...': 'संदेश लिखें...', 'Send': 'भेजें', 'Internal note (not visible to patient)': 'आंतरिक नोट (रोगी को नहीं दिखेगा)', 'Internal': 'आंतरिक',
  'Conversation': 'बातचीत', 'Timeline': 'समयरेखा', 'Due': 'देय', 'Resolution time': 'समाधान समय', 'Mark as resolved': 'सुलझा हुआ चिह्नित करें',
  'Close complaint': 'शिकायत बंद करें', 'Reopen': 'फिर से खोलें', 'Rate the resolution': 'समाधान को रेटिंग दें', 'Thanks for rating': 'रेटिंग के लिए धन्यवाद',
  'Search by title, ticket or text': 'शीर्षक, टिकट या टेक्स्ट से खोजें', 'All statuses': 'सभी स्थितियां', 'All priorities': 'सभी प्राथमिकताएं',
  'All categories': 'सभी श्रेणियां', 'Only escalated': 'केवल एस्केलेट', 'Only overdue': 'केवल देर से', 'Assigned to me': 'मुझे सौंपी',
  'Newest first': 'सबसे नई पहले', 'Oldest first': 'सबसे पुरानी पहले', 'By priority': 'प्राथमिकता से', 'Due soonest': 'जल्द देय',
  'Active': 'सक्रिय', 'Overdue by {{h}}': '{{h}} की देरी', 'Due in {{h}}': '{{h}} में देय', 'Ticket': 'टिकट', 'Auto-escalated': 'स्वतः एस्केलेट',
  'Submitted anonymously': 'गुमनाम रूप से जमा', 'Submit anonymously (hide my name from staff)': 'गुमनाम जमा करें (मेरा नाम स्टाफ से छिपाएं)',
  // statuses / priorities
  'Open': 'खुली', 'Assigned': 'सौंपी गई', 'In Progress': 'प्रगति में', 'Resolved': 'सुलझी', 'Closed': 'बंद', 'Pending': 'लंबित', 'Accepted': 'स्वीकृत',
  'Completed': 'पूर्ण', 'Cancelled': 'रद्द', 'Low': 'कम', 'Medium': 'मध्यम', 'High': 'उच्च', 'Urgent': 'अत्यावश्यक',
  // categories
  'Doctor Behavior': 'डॉक्टर का व्यवहार', 'Staff Behavior': 'स्टाफ का व्यवहार', 'Cleanliness & Hygiene': 'सफाई एवं स्वच्छता', 'Billing & Payments': 'बिलिंग एवं भुगतान',
  'Waiting Time': 'प्रतीक्षा समय', 'Food & Nutrition': 'भोजन एवं पोषण', 'Facilities & Infrastructure': 'सुविधाएं एवं ढांचा', 'Treatment & Medical Care': 'उपचार एवं चिकित्सा देखभाल',
  'Pharmacy & Medication': 'फार्मेसी एवं दवाइयां', 'Emergency Services': 'आपातकालीन सेवाएं', 'Other': 'अन्य',
  // requests
  'Request type': 'अनुरोध का प्रकार', 'Ward / room / bed': 'वार्ड / कमरा / बिस्तर', 'Submit request': 'अनुरोध जमा करें', 'Track status': 'स्थिति देखें',
  'Accept': 'स्वीकार करें', 'Start work': 'काम शुरू करें', 'Mark completed': 'पूर्ण चिह्नित करें', 'Cancel request': 'अनुरोध रद्द करें', 'Request submitted': 'अनुरोध जमा हो गया',
  'Wheelchair/Stretcher': 'व्हीलचेयर/स्ट्रेचर', 'Ambulance': 'एम्बुलेंस', 'Meal/Diet Request': 'भोजन/आहार अनुरोध', 'Housekeeping/Cleaning': 'हाउसकीपिंग/सफाई',
  'Medical Records': 'मेडिकल रिकॉर्ड', 'Appointment Assistance': 'अपॉइंटमेंट सहायता', 'Billing Assistance': 'बिलिंग सहायता', 'Nurse Assistance': 'नर्स सहायता',
  // notifications
  'Mark all as read': 'सभी पढ़ा हुआ चिह्नित करें', 'No notifications': 'कोई सूचना नहीं', 'New notification': 'नई सूचना',
  // admin
  'Add user': 'उपयोगकर्ता जोड़ें', 'Edit user': 'उपयोगकर्ता संपादित करें', 'Designation': 'पदनाम', 'Is a doctor': 'डॉक्टर है', 'Active account': 'सक्रिय खाता',
  'Deactivate': 'निष्क्रिय करें', 'Activate': 'सक्रिय करें', 'Set password': 'पासवर्ड सेट करें', 'Add department': 'विभाग जोड़ें', 'Edit department': 'विभाग संपादित करें',
  'Inactive': 'निष्क्रिय', 'Doctors & staff': 'डॉक्टर और स्टाफ', 'Doctor': 'डॉक्टर', 'Ratings': 'रेटिंग', 'Assigned complaints': 'सौंपी गई शिकायतें',
  'Download PDF': 'पीडीएफ डाउनलोड करें', 'Summary report': 'सारांश रिपोर्ट', 'Department performance': 'विभाग प्रदर्शन', 'Staff performance': 'स्टाफ प्रदर्शन',
  'Complaint register': 'शिकायत रजिस्टर', 'From': 'से', 'To': 'तक', 'Generate': 'बनाएं', 'Audit log': 'ऑडिट लॉग', 'Print': 'प्रिंट करें', 'Download PNG': 'पीएनजी डाउनलोड',
  'Hospital-wide': 'पूरे अस्पताल के लिए', 'Scan to give feedback': 'फीडबैक देने के लिए स्कैन करें',
  // profile / privacy
  'My profile': 'मेरी प्रोफ़ाइल', 'Email notifications': 'ईमेल सूचनाएं', 'Privacy & data': 'गोपनीयता एवं डेटा', 'Download my data': 'मेरा डेटा डाउनलोड करें',
  'Delete my account': 'मेरा खाता हटाएं', 'Profile updated': 'प्रोफ़ाइल अपडेट हो गई', 'Enter your password to confirm': 'पुष्टि के लिए पासवर्ड डालें',
  'This permanently removes your personal details. Feedback and complaints are kept anonymously.': 'यह आपकी व्यक्तिगत जानकारी स्थायी रूप से हटा देगा। फीडबैक और शिकायतें गुमनाम रूप से रखी जाएंगी।',
  // misc
  'Page not found': 'पृष्ठ नहीं मिला', 'Go home': 'होम जाएं', 'Something went wrong': 'कुछ गलत हो गया', 'Saved': 'सहेजा गया', 'Done': 'हो गया',
  'This account is a': 'यह खाता है', 'Created': 'बनाया गया', 'Updated': 'अपडेट किया', 'Last login': 'अंतिम लॉगिन', 'Hospital Feedback & Service System': 'अस्पताल फीडबैक एवं सेवा प्रणाली',
  // analytics / reports / admin pages
  'Period': 'अवधि', 'Granularity': 'विवरण स्तर', 'Average rating over time': 'समय के साथ औसत रेटिंग', 'Complaint resolution time': 'शिकायत समाधान समय',
  'Average': 'औसत', 'Fastest': 'सबसे तेज़', 'Slowest': 'सबसे धीमा', 'Resolution rating': 'समाधान रेटिंग', '% of 4-5 star ratings': '4-5 स्टार रेटिंग का %',
  'Generate printable PDF reports for management.': 'प्रबंधन के लिए प्रिंट योग्य पीडीएफ रिपोर्ट बनाएं।', 'All time': 'पूरा समय', 'Custom range': 'अपनी अवधि',
  'Generating...': 'बन रही है...', '"From" date must be before "To" date': '"से" तारीख "तक" से पहले होनी चाहिए',
  'Satisfaction score, complaints, categories, priorities and service requests.': 'संतुष्टि स्कोर, शिकायतें, श्रेणियां, प्राथमिकताएं और सेवा अनुरोध।',
  'Ratings, complaints, escalations and resolution time for every department.': 'हर विभाग की रेटिंग, शिकायतें, एस्केलेशन और समाधान समय।',
  'Doctor and staff ratings, assigned complaints and resolution rates.': 'डॉक्टर और स्टाफ की रेटिंग, सौंपी गई शिकायतें और समाधान दर।',
  'The latest 300 complaints with priority, status, assignee and resolution time.': 'प्राथमिकता, स्थिति, जिम्मेदार और समाधान समय सहित नवीनतम 300 शिकायतें।',
  'Search by name or email': 'नाम या ईमेल से खोजें', 'All roles': 'सभी भूमिकाएं', 'You': 'आप', 'patient': 'रोगी', 'staff': 'स्टाफ', 'admin': 'एडमिन',
  'No departments yet': 'अभी कोई विभाग नहीं', 'Allow pop-ups to print': 'प्रिंट के लिए पॉप-अप की अनुमति दें', 'Copied': 'कॉपी हो गया', 'Could not copy': 'कॉपी नहीं हो सका',
  'Copy link': 'लिंक कॉपी करें', 'Patients can scan a code to share feedback without logging in.': 'मरीज़ बिना लॉग इन किए कोड स्कैन करके फीडबैक दे सकते हैं।',
  'Data privacy and security management': 'डेटा गोपनीयता और सुरक्षा प्रबंधन', 'Protection measures': 'सुरक्षा उपाय', 'Action': 'कार्रवाई', 'User': 'उपयोगकर्ता',
  'Details': 'विवरण', 'All actions': 'सभी कार्रवाइयां',
  'Passwords are hashed with bcrypt and never returned by the API': 'पासवर्ड bcrypt से सुरक्षित हैं और API कभी वापस नहीं भेजती',
  'JWT sessions with role-based access control on every route': 'हर रूट पर JWT सत्र और भूमिका-आधारित अनुमति',
  'Accounts lock for 15 minutes after 5 failed logins': '5 गलत लॉगिन के बाद खाता 15 मिनट के लिए लॉक हो जाता है',
  'Rate limiting, secure HTTP headers (Helmet) and NoSQL-injection filtering': 'रेट लिमिट, सुरक्षित HTTP हेडर (Helmet) और NoSQL-इंजेक्शन फ़िल्टर',
  'Anonymous feedback and complaints hide the patient identity from staff and admins': 'गुमनाम फीडबैक और शिकायतों में रोगी की पहचान स्टाफ और एडमिन से छिपी रहती है',
  'Patients can download or erase their personal data': 'रोगी अपना व्यक्तिगत डेटा डाउनलोड या मिटा सकते हैं',
  'Every sensitive action is written to the audit log below (kept for 180 days)': 'हर संवेदनशील कार्रवाई नीचे ऑडिट लॉग में दर्ज होती है (180 दिन तक)',
  'Passwords do not match': 'पासवर्ड मेल नहीं खाते', 'Password updated successfully': 'पासवर्ड सफलतापूर्वक अपडेट हुआ', 'Your account has been deleted': 'आपका खाता हटा दिया गया है',
  'Change password': 'पासवर्ड बदलें', 'Update password': 'पासवर्ड अपडेट करें', 'Current password': 'वर्तमान पासवर्ड', 'New password': 'नया पासवर्ड',
  'You can download a copy of everything we store about you.': 'हम आपके बारे में जो कुछ रखते हैं उसकी प्रति आप डाउनलोड कर सकते हैं।',
  'At least 8 characters with a letter and a number': 'कम से कम 8 अक्षर, जिनमें एक अक्षर और एक अंक हो',
  'Avg resolution time': 'औसत समाधान समय', 'Resolved': 'सुलझी',
  'Patient / Staff': 'रोगी / स्टाफ', 'Admin': 'एडमिन', 'Admin login': 'एडमिन लॉगिन', 'Login type': 'लॉगिन का प्रकार', 'Admin Portal': 'एडमिन पोर्टल', 'Administrator Portal': 'प्रशासक पोर्टल',
  'Restricted area for hospital administrators': 'अस्पताल प्रशासकों के लिए प्रतिबंधित क्षेत्र', 'All complaints and feedback': 'सभी शिकायतें और फीडबैक',
  'Analytics and reports': 'विश्लेषण और रिपोर्ट', 'Users and departments': 'उपयोगकर्ता और विभाग', 'Security and audit log': 'सुरक्षा और ऑडिट लॉग',
  'Admin sign in': 'एडमिन साइन इन', 'Only authorised administrators can continue.': 'केवल अधिकृत प्रशासक ही आगे बढ़ सकते हैं।', 'Patient / staff login': 'रोगी / स्टाफ लॉगिन',
};

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('hfm_lang') : null;

i18n.use(initReactI18next).init({
  resources: { en: { translation: {} }, hi: { translation: hi } },
  lng: saved === 'hi' ? 'hi' : 'en',
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

export const setLanguage = (lng) => {
  i18n.changeLanguage(lng);
  try { localStorage.setItem('hfm_lang', lng); } catch (e) { /* ignore */ }
  document.documentElement.lang = lng;
};

export default i18n;
