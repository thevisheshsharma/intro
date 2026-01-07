'use client'

import { motion } from 'framer-motion'

const STANDARD_EASE = [0.25, 0.1, 0.25, 1] as const

export default function TermsPage() {
    return (
        <section className="pt-32 pb-20 bg-gray-50 min-h-screen">
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: STANDARD_EASE }}
                    className="max-w-3xl mx-auto"
                >
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium mb-6">
                        Legal
                    </span>
                    <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-gray-900 mb-4">
                        Terms of Service
                    </h1>
                    <p className="text-gray-500 mb-12">Last updated: January 2025</p>

                    <div className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-700 prose-li:text-gray-700">
                        <p>
                            Welcome to Berri. These Terms of Service (&quot;Terms&quot;) govern your access to and use of
                            the Berri platform, including our website, applications, and services (collectively, the &quot;Service&quot;).
                            By accessing or using the Service, you agree to be bound by these Terms.
                        </p>

                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            By creating an account or using our Service, you acknowledge that you have read, understood,
                            and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms,
                            you may not access or use the Service.
                        </p>
                        <p>
                            You must be at least 18 years old to use the Service. By using the Service, you represent
                            and warrant that you meet this age requirement.
                        </p>

                        <h2>2. Description of Service</h2>
                        <p>
                            Berri is a relationship intelligence platform that helps users discover warm introduction
                            paths, access company and people intelligence, and manage professional networking activities.
                            Our Service includes:
                        </p>
                        <ul>
                            <li>Network mapping and path discovery (Pathfinder)</li>
                            <li>Company intelligence and research tools</li>
                            <li>People intelligence and contact discovery</li>
                            <li>Message composition and outreach tools (Ping)</li>
                        </ul>

                        <h2>3. User Accounts</h2>
                        <h3>3.1 Account Creation</h3>
                        <p>
                            To access certain features, you must create an account. You agree to provide accurate,
                            current, and complete information during registration and to update such information
                            to keep it accurate, current, and complete.
                        </p>

                        <h3>3.2 Account Security</h3>
                        <p>
                            You are responsible for safeguarding your account credentials and for all activities
                            that occur under your account. You must notify us immediately of any unauthorized use
                            of your account or any other security breach.
                        </p>

                        <h3>3.3 Account Termination</h3>
                        <p>
                            We reserve the right to suspend or terminate your account at any time for any reason,
                            including violation of these Terms. You may also delete your account at any time through
                            your account settings or by contacting support.
                        </p>

                        <h2>4. Acceptable Use</h2>
                        <p>You agree not to use the Service to:</p>
                        <ul>
                            <li>Violate any applicable laws, regulations, or third-party rights</li>
                            <li>Send spam, unsolicited messages, or engage in harassment</li>
                            <li>Scrape, crawl, or use automated means to access the Service without permission</li>
                            <li>Attempt to gain unauthorized access to other accounts or systems</li>
                            <li>Distribute malware, viruses, or other harmful code</li>
                            <li>Impersonate any person or entity</li>
                            <li>Interfere with or disrupt the Service or servers</li>
                            <li>Use the Service for any illegal or unauthorized purpose</li>
                            <li>Resell, sublicense, or redistribute access to the Service</li>
                            <li>Use data obtained through the Service to compile competing databases</li>
                        </ul>

                        <h2>5. Subscription and Payment</h2>
                        <h3>5.1 Pricing</h3>
                        <p>
                            Access to certain features requires a paid subscription. Current pricing is available
                            on our pricing page. We reserve the right to change prices with 30 days&apos; notice.
                        </p>

                        <h3>5.2 Billing</h3>
                        <p>
                            Subscriptions are billed in advance on a monthly or annual basis. All payments are
                            non-refundable except as expressly set forth in these Terms or required by law.
                        </p>

                        <h3>5.3 Cancellation</h3>
                        <p>
                            You may cancel your subscription at any time. Cancellation will take effect at the
                            end of the current billing period. You will continue to have access to paid features
                            until your subscription expires.
                        </p>

                        <h3>5.4 Free Trial</h3>
                        <p>
                            We may offer free trials at our discretion. At the end of the trial period, your
                            account will be charged unless you cancel before the trial ends.
                        </p>

                        <h2>6. Intellectual Property</h2>
                        <h3>6.1 Our Rights</h3>
                        <p>
                            The Service and its original content, features, and functionality are owned by Berri
                            and are protected by international copyright, trademark, patent, and other intellectual
                            property laws. Our trademarks may not be used without our prior written consent.
                        </p>

                        <h3>6.2 Your Content</h3>
                        <p>
                            You retain ownership of any content you submit to the Service. By submitting content,
                            you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify,
                            and display such content solely to provide and improve the Service.
                        </p>

                        <h3>6.3 Feedback</h3>
                        <p>
                            Any feedback, suggestions, or ideas you provide about the Service may be used by us
                            without any obligation to compensate you.
                        </p>

                        <h2>7. Third-Party Services</h2>
                        <p>
                            The Service may integrate with or link to third-party services (such as Twitter/X,
                            LinkedIn, payment processors). Your use of such services is subject to their respective
                            terms and privacy policies. We are not responsible for the content, accuracy, or
                            practices of third-party services.
                        </p>

                        <h2>8. Data and Privacy</h2>
                        <p>
                            Your use of the Service is also governed by our Privacy Policy, which describes how
                            we collect, use, and protect your information. By using the Service, you consent to
                            our data practices as described in the Privacy Policy.
                        </p>

                        <h2>9. Disclaimers</h2>
                        <p>
                            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
                            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                        </p>
                        <p>
                            We do not warrant that the Service will be uninterrupted, secure, or error-free,
                            or that any information obtained through the Service will be accurate or reliable.
                            The accuracy of company and people intelligence data cannot be guaranteed.
                        </p>

                        <h2>10. Limitation of Liability</h2>
                        <p>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, BERRI AND ITS OFFICERS, DIRECTORS, EMPLOYEES,
                            AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                            OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY
                            OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                        </p>
                        <p>
                            IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12)
                            MONTHS PRECEDING THE CLAIM OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
                        </p>

                        <h2>11. Indemnification</h2>
                        <p>
                            You agree to indemnify, defend, and hold harmless Berri and its officers, directors,
                            employees, and agents from any claims, damages, losses, liabilities, and expenses
                            (including attorneys&apos; fees) arising from your use of the Service, violation of these
                            Terms, or infringement of any third-party rights.
                        </p>

                        <h2>12. Modifications to Terms</h2>
                        <p>
                            We reserve the right to modify these Terms at any time. We will notify you of material
                            changes by posting the updated Terms on this page and updating the &quot;Last updated&quot; date.
                            Your continued use of the Service after changes constitutes acceptance of the modified Terms.
                        </p>

                        <h2>13. Governing Law</h2>
                        <p>
                            These Terms shall be governed by and construed in accordance with the laws of the
                            State of Delaware, United States, without regard to its conflict of law provisions.
                            Any disputes arising from these Terms shall be resolved in the courts of Delaware.
                        </p>

                        <h2>14. Dispute Resolution</h2>
                        <p>
                            Any dispute arising from these Terms or the Service shall first be attempted to be
                            resolved through good-faith negotiation. If negotiation fails, the dispute shall be
                            submitted to binding arbitration in accordance with the rules of the American
                            Arbitration Association.
                        </p>

                        <h2>15. General Provisions</h2>
                        <ul>
                            <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and Berri regarding the Service.</li>
                            <li><strong>Severability:</strong> If any provision of these Terms is found unenforceable, the remaining provisions shall remain in effect.</li>
                            <li><strong>Waiver:</strong> Our failure to enforce any right or provision shall not constitute a waiver of such right or provision.</li>
                            <li><strong>Assignment:</strong> You may not assign your rights under these Terms without our consent. We may assign our rights at any time.</li>
                        </ul>

                        <h2>16. Contact Us</h2>
                        <p>
                            If you have questions about these Terms, please contact us at:
                        </p>
                        <ul>
                            <li>Email: legal@berri.ai</li>
                            <li>Address: Berri Inc., [Address to be added]</li>
                        </ul>

                        <div className="mt-12 p-6 rounded-2xl bg-white border border-gray-200">
                            <p className="text-sm text-gray-500 mb-0">
                                By using Berri, you acknowledge that you have read, understood, and agree to be
                                bound by these Terms of Service.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
