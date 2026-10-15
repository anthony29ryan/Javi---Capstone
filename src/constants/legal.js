// Terms and Privacy, shown in the sign-up Terms popup and read-only from
// Settings > Terms & privacy.
//
// Every claim here was checked against what the app actually does (tutor
// always uses Gemini's free tier, the 30-day deletion window, no analytics).
// Change the text and the app together, and bump TERMS_VERSION: sign-up
// records which version each user accepted.
//
// A section's body is a list of parts: a string is a paragraph; an object is a
// bullet list, with an optional bold label above it.

export const TERMS_VERSION = '2026-10-16';
export const TERMS_UPDATED = '16 Oct 2026';
export const LEGAL_CONTACT = 'support.javi@gmail.com';

const APP_NAME = 'Javi: An AI-Powered Android Application for Java Learning ("Javi," "the Application," "we," "our," or "us")';

export const LEGAL_DOCS = {
  terms: {
    title: 'Terms and Conditions',
    intro: `Welcome to ${APP_NAME}. These Terms and Conditions govern your use of Javi and its learning features. By creating an account or using Javi, you acknowledge that you have read, understood and agreed to them. If you do not agree, do not use the Application.`,
    sections: [
      {
        h: 'Purpose of the Application',
        body: [
          'Javi helps learners study and improve their Java programming skills. It provides structured Java lessons, quizzes, Code Tracer typing drills, progress tracking, suggestions on topics to review, and an AI tutor.',
          'It is a supplementary educational resource, not a replacement for formal education, instructors or other programming resources.',
        ],
      },
      {
        h: 'User Account',
        body: [
          `You need an account to use Javi. Provide accurate information and keep your password private. You are responsible for activity on your account, and should report any suspected unauthorized access or security issue to ${LEGAL_CONTACT} right away.`,
        ],
      },
      {
        h: 'Acceptable Use',
        body: [
          'Use Javi only for lawful and educational purposes. You must not:',
          {
            items: [
              'use the Application for illegal activities;',
              'try to gain unauthorized access to the Application, its database or its backend services;',
              'interfere with or damage the Application or its services;',
              'send malicious or harmful content, including through the AI tutor;',
              "try to bypass security measures or limits, such as the tutor's daily question limit;",
              'use the AI tutor to produce content meant to help unlawful activities;',
              'impersonate another user or the development team; or',
              "abuse, misuse or intentionally disrupt the Application's features.",
            ],
          },
        ],
      },
      {
        h: 'AI Tutor and AI-Generated Content',
        body: [
          'The tutor answers Java questions about the module you are studying, with explanations, examples and hints. It is designed to guide your learning rather than hand over quiz answers, and it declines questions outside the module.',
          'Answers may contain errors or be incomplete, so check important information against the lessons, your instructors or the official Java documentation.',
          'Every tutor question is sent over the internet to Google Gemini, so the tutor needs a connection. Each account can ask up to 30 questions in any 24 hours.',
        ],
      },
      {
        h: 'Learning Content',
        body: [
          'The lessons, quizzes, drills and other materials in Javi are for learning. Do not reproduce, redistribute, sell or use them for commercial purposes without permission.',
        ],
      },
      {
        h: 'Information You Provide',
        body: [
          'You provide information through your account, your learning activity and your questions to the AI tutor. Do not submit confidential, sensitive or private information that a learning activity does not need, especially in tutor questions.',
        ],
      },
      {
        h: 'Application Availability',
        body: [
          'The development team will make reasonable efforts to keep Javi working and available. It may occasionally be unavailable because of maintenance, updates, technical problems, internet connectivity or problems with third-party services.',
          'Lessons you download can be read offline; quizzes, Code Tracer, the AI tutor and saving progress need an internet connection.',
        ],
      },
      {
        h: 'Third-Party Services',
        body: [
          "Javi uses Firebase (by Google) for sign-in, its database and its server functions, and Google Gemini for the AI tutor. These services are subject to their providers' own terms, policies and technical limits.",
        ],
      },
      {
        h: 'Privacy',
        body: [
          'Javi processes your information only for account management, app features, learning progress, personalised suggestions, quizzes and the AI tutor, in accordance with Philippine data privacy law, including Republic Act No. 10173, the Data Privacy Act of 2012.',
          'The Privacy tab explains what is collected, how it is used and stored, and your rights.',
        ],
      },
      {
        h: 'Intellectual Property',
        body: [
          'The Javi application, including its interface, original software, educational materials, design and other original content, belongs to the Javi project team or its authorized contributors unless otherwise stated. Unauthorized copying, modification, distribution or commercial use of these materials is prohibited.',
        ],
      },
      {
        h: 'Limitation of Responsibility',
        body: [
          'Javi is an educational, supplementary learning tool. The development team does not guarantee that all materials or AI-generated answers will always be complete, accurate or error-free. You remain responsible for reviewing and applying what you learn appropriately.',
        ],
      },
      {
        h: 'Changes to the Terms',
        body: [
          'These Terms may be updated to reflect changes in the Application, legal requirements, security practices or other operational needs. Significant changes will be communicated through a notice in the Application when applicable.',
        ],
      },
      {
        h: 'Termination',
        body: [
          "You can delete your account at any time in Settings. Access may be suspended or terminated if a user violates these Terms, abuses the Application, attempts unauthorized access, or does anything that may compromise Javi's security or proper operation.",
        ],
      },
      {
        h: 'Governing Law',
        body: [
          'These Terms are interpreted in accordance with the laws and regulations of the Republic of the Philippines.',
        ],
      },
      {
        h: 'Contact',
        body: [`For questions, concerns, privacy requests or reports, write to ${LEGAL_CONTACT}.`],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    intro: `This Privacy Policy explains how ${APP_NAME} collects, uses, stores and protects your information. Javi is an educational application for learning Java, and this policy aims to be clear about what it processes and why.`,
    sections: [
      {
        h: 'Information We Collect',
        body: [
          {
            label: 'A. Account information',
            items: [
              'your name and email address, and the nickname and avatar you choose;',
              'your password, which is handled by Firebase Authentication and never stored by Javi in plain text;',
              'the daily reminder time you choose at setup, and any study goals saved by earlier versions of the app; and',
              'when you accepted these documents, and which version.',
            ],
          },
          {
            label: 'B. Learning and progress information',
            items: [
              'lessons completed and the last lesson you opened;',
              'your quiz answers: each answer’s topic, whether it was correct, how long it took and which attempt it was;',
              'quiz scores for each module;',
              'Code Tracer programs completed;',
              'your study streak; and',
              'topics suggested for review, worked out from your quiz answers.',
            ],
          },
          {
            label: 'C. AI tutor information',
            items: ['your questions to the tutor and its replies, saved per module so you can return to them.'],
          },
          {
            label: 'D. On your device',
            items: [
              "lessons you download for offline reading, kept in the app's storage on your phone; and",
              'study reminders, scheduled as notifications on your phone.',
            ],
          },
        ],
      },
      {
        h: 'Purpose of Data Collection',
        body: [
          'Your information is used to:',
          {
            items: [
              'create and manage your account, and sign you in;',
              'save and show your learning progress;',
              'grade quizzes and record your scores;',
              'suggest topics to review;',
              'send the study reminders you set;',
              'answer your AI tutor questions;',
              "keep the Application secure, for example by enforcing the tutor's daily limit;",
              'respond when you contact us; and',
              'maintain, troubleshoot and improve the Application.',
            ],
          },
        ],
      },
      {
        h: 'Legal Basis for Processing',
        body: [
          'Javi processes personal information only when there is a lawful basis under Philippine data privacy law. Your consent is asked for when you accept these documents at sign-up, and the app records the time and version you accepted.',
          'Processing follows the principles of transparency, legitimate purpose and proportionality under the Data Privacy Act of 2012 and its implementing rules.',
        ],
      },
      {
        h: 'Use of Information',
        body: [
          'Personal information is used only for the operation and educational functions of Javi. Javi does not intentionally collect personal information it does not need. Your information is never sold to third parties for advertising or any other purpose.',
        ],
      },
      {
        h: 'Data Sharing and Third-Party Services',
        body: [
          'Javi relies on two providers:',
          {
            items: [
              'Firebase (Google): Firebase Authentication for sign-in, Cloud Firestore to store your data, and Cloud Functions for quiz grading, topic suggestions and the tutor.',
              "Google Gemini: receives your tutor questions, together with the current module's lesson text, to write answers. Javi uses Gemini's free tier, under which Google may use the content it receives to improve its products. Never include personal details in tutor questions.",
            ],
          },
          'No other third parties receive your information, except where the law requires it.',
        ],
      },
      {
        h: 'Data Storage and Security',
        body: [
          "Your data is stored with Firebase and encrypted in transit and at rest. Javi's security rules let only you read and change your own data, and course content cannot be changed from the app.",
          'No electronic system can guarantee absolute security, so protect your password and do not share it.',
        ],
      },
      {
        h: 'Data Retention',
        body: [
          'Your information is kept while your account exists. When you delete your account in Settings, your profile, progress, quiz answers and tutor conversations are permanently removed 30 days later; logging back in before then lets you restore it.',
          'Lessons downloaded to your phone stay there until you remove them in Settings or uninstall the app.',
        ],
      },
      {
        h: 'Your Privacy Rights',
        body: [
          'Under the Data Privacy Act, you have the right:',
          {
            items: [
              'to be informed;',
              'to access your data;',
              'to object;',
              'to have inaccurate data corrected;',
              'to erasure or blocking, subject to applicable conditions;',
              'to data portability, where applicable; and',
              'to file a complaint about unlawful or improper processing.',
            ],
          },
          'These rights are recognized by the National Privacy Commission.',
          `You can change your name in Profile details and delete your account in Settings. For anything else, such as a copy of your data, a correction or an objection, write to ${LEGAL_CONTACT}.`,
        ],
      },
      {
        h: "Children's Privacy",
        body: [
          'Javi is an educational application for learners. Users who are minors should use it with the involvement of a parent, guardian or appropriate educational authority when required by law or institutional policy. Javi does not knowingly collect unnecessary personal information from minors.',
        ],
      },
      {
        h: 'Sign-in Sessions and Device Storage',
        body: [
          'Javi does not use advertising cookies, trackers or analytics. Firebase keeps you signed in with a session token stored on your phone, and the app stores downloaded lessons and a few settings on your device. These are used only to make the app work.',
        ],
      },
      {
        h: 'AI and Automated Processing',
        body: [
          'AI-generated tutor answers may be inaccurate or incomplete and should not be treated as authoritative. The tutor is designed to guide you with explanations, examples and hints rather than hand over complete answers.',
          'Javi also uses a small model, trained on generated practice data, to suggest topics you may need to review based on your quiz results. These suggestions only guide what you study; they do not affect your grades or your account.',
          'Avoid entering sensitive personal information into tutor conversations.',
        ],
      },
      {
        h: 'Changes to this Privacy Policy',
        body: [
          'This policy may be updated because of changes to the Application, technology, privacy practices or applicable laws. Significant changes will be communicated through a notice in the Application when applicable.',
        ],
      },
      {
        h: 'Contact and Privacy Concerns',
        body: [
          `For questions, requests or concerns about your personal information, write to ${LEGAL_CONTACT}. You may also raise privacy concerns with the National Privacy Commission (NPC) where applicable.`,
        ],
      },
      {
        h: 'User Acknowledgment',
        body: [
          'By creating an account or using Javi, you acknowledge that you have been informed about the collection and processing of your personal information as described in this policy, subject to the lawful bases and rights under Philippine data privacy law.',
          'Javi aims to process personal information responsibly, in line with the principles of transparency, legitimate purpose and proportionality.',
        ],
      },
    ],
  },
};
