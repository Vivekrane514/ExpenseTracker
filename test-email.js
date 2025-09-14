// Test script to check email functionality
import { sendEmail } from './actions/send-email.js';
import EmailTemplate from './emails/template.jsx';

async function testEmail() {
  console.log('Testing email functionality...');

  // Check if RESEND_API_KEY is set
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set in environment variables');
    return;
  }

  console.log('✅ RESEND_API_KEY is set');

  try {
    // Test sending an email
    const result = await sendEmail({
      to: 'test@example.com', // Replace with your test email
      subject: 'Test Email from Expense Tracker',
      react: EmailTemplate({
        userName: 'Test User',
        type: 'budget-alert',
        data: {
          percentageUsed: 85,
          budgetAmount: '1000',
          totalExpenses: '850',
          accountName: 'Test Account'
        }
      })
    });

    if (result.success) {
      console.log('✅ Email sent successfully:', result.data);
    } else {
      console.error('❌ Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during email test:', error);
  }
}

testEmail();
