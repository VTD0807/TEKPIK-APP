export const metadata = {
    title: 'Privacy Policy - TEKPIK',
    description: 'Privacy Policy for TEKPIK.',
}

export default function PrivacyPolicy() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-slate-700 space-y-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
            <div className="prose prose-slate max-w-none space-y-6">
                <p><strong>Last Updated: May 2026</strong></p>
                <p>
                    Welcome to TEKPIK. We value your privacy and are committed to protecting your personal data. 
                    This Privacy Policy explains how we collect, use, and share your information when you visit 
                    our website (tekpik.in), use our services, or interact with our platform.
                </p>

                <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">1. Information We Collect</h2>
                <p>We collect the following types of information:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and authentication credentials via secure OAuth providers like Google.</li>
                    <li><strong>Usage Data:</strong> We automatically collect information about your interaction with our site, including IP addresses, browser types, device information, and pages visited.</li>
                    <li><strong>User Content:</strong> Any reviews, comments, or wishlists you create on our platform.</li>
                </ul>

                <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">2. How We Use Your Information</h2>
                <p>We use the collected information for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>To provide, maintain, and improve our services and AI curation engine.</li>
                    <li>To personalize your experience, including personalized top feeds and recommendations.</li>
                    <li>To communicate with you regarding updates, security alerts, and support messages.</li>
                    <li>To monitor and analyze trends, usage, and activities in connection with our platform.</li>
                </ul>

                <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">3. Data Sharing and Third Parties</h2>
                <p>
                    We do not sell your personal data. However, we may share your information with trusted third parties 
                    that assist us in operating our website, conducting our business, or servicing you, provided those parties 
                    agree to keep this information confidential. 
                </p>
                <p>
                    <strong>Affiliate Links:</strong> Our website contains links to Amazon. When you click on these links, 
                    Amazon may collect data according to their own privacy policies. TEKPIK is a participant in the Amazon Services 
                    LLC Associates Program.
                </p>

                <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">4. Data Security</h2>
                <p>
                    We implement industry-standard security measures to protect your personal information. Our databases are secured 
                    using Google Cloud infrastructure (Firebase/Firestore) with strict security rules to prevent unauthorized access.
                </p>

                <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">5. Your Rights</h2>
                <p>
                    You have the right to access, update, or delete your personal information at any time. You can manage your data 
                    through your account settings or by contacting our support team.
                </p>

                <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">6. Changes to This Policy</h2>
                <p>
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
                    Privacy Policy on this page and updating the "Last Updated" date.
                </p>

                <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">7. Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy, please contact us at: <br/>
                    <strong>Email:</strong> support@tekpik.app
                </p>
            </div>
        </div>
    )
}
