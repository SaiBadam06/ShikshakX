import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckBadgeIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import ThemeToggle from '../components/ThemeToggle';

interface LandingProps {
  theme: 'day' | 'dark';
  onToggleTheme: () => void;
}

const featureCards = [
  {
    title: 'Learn in one place',
    description: 'Courses, materials, notes, and progress all stay connected so studying feels coherent instead of scattered.',
    icon: BookOpenIcon,
  },
  {
    title: 'Plan with AI and calendar sync',
    description: 'Turn goals into realistic study plans, tasks, and calendar events that fit your real week.',
    icon: CalendarDaysIcon,
  },
  {
    title: 'Ask, quiz, revise',
    description: 'Use AI-powered Q&A, summaries, and adaptive quizzes without jumping between tools.',
    icon: SparklesIcon,
  },
  {
    title: 'Grow with community',
    description: 'Find friends by Gmail, build communities, and keep both public and private study conversations alive.',
    icon: UserGroupIcon,
  },
];

const journeySteps = [
  'Start with Google sign-in and your workspace is prepared automatically.',
  'Explore courses, collect materials, and convert them into notes or summaries.',
  'Use tasks and the planner to map out what to study next and when to do it.',
  'Generate AI quizzes, revisit previous attempts, and sharpen weak areas.',
  'Stay accountable through communities, private friend rooms, and shared support.',
];

const Landing: React.FC<LandingProps> = ({ theme, onToggleTheme }) => {
  return (
    <div className="app-shell relative min-h-screen overflow-hidden px-5 py-6 md:px-8 md:py-8">
      <div className="mesh-orb mesh-orb-one" />
      <div className="mesh-orb mesh-orb-two" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-badge">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">ShikshakX</p>
              <p className="text-sm text-slate-500">AI-powered learning companion</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Link to="/login" className="app-button-primary px-5 py-3 text-sm">
              Login
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
          <div className="app-panel-strong hero-gradient mesh-panel relative overflow-hidden p-8 md:p-12">
            <div className="page-eyebrow mb-6">
              <SparklesIcon className="h-4 w-4" />
              Start to finish learning workflow
            </div>
            <h1 className="page-title max-w-4xl text-slate-950">
              A visually polished study platform that takes a learner from planning to practice to progress.
            </h1>
            <p className="page-copy mt-6 max-w-3xl text-lg">
              ShikshakX is designed as a complete academic operating system: organize coursework, generate plans, ask grounded questions,
              track deadlines, sync calendars, take AI-built quizzes, and stay connected with supportive peers.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="metric-chip">
                <CheckBadgeIcon className="h-4 w-4" />
                Calendar-ready workflow
              </div>
              <div className="metric-chip">
                <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                AI + community together
              </div>
              <div className="metric-chip">
                <UserGroupIcon className="h-4 w-4" />
                Personal and shared spaces
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/login" className="app-button-primary px-6 py-4 text-sm">
                Continue with Google
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <a href="#journey" className="app-button-secondary px-6 py-4 text-sm">
                See the journey
              </a>
            </div>
          </div>

          <div className="scene-3d">
            <div className="tilt-card tilt-card-primary">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Student journey</p>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950">From first login to daily momentum</h2>
              <div className="mt-6 space-y-3">
                {journeySteps.map((step) => (
                  <div key={step} className="rounded-[1.25rem] border border-white/70 bg-white/78 px-4 py-3 text-sm leading-6 text-slate-600">
                    {step}
                  </div>
                ))}
              </div>
            </div>
            <div className="tilt-card tilt-card-secondary">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Why it feels different</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The product is built to reduce mental clutter: one calm interface, stronger hierarchy, and tools that work together instead of living in separate tabs.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <div key={title} className="app-panel floating-card rounded-[1.7rem] p-6">
              <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-extrabold tracking-tight text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            </div>
          ))}
        </section>

        <section id="journey" className="app-panel-strong rounded-[2rem] p-8 md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="page-eyebrow mb-5">
                <BookOpenIcon className="h-4 w-4" />
                Project walkthrough
              </p>
              <h2 className="section-title text-[clamp(2rem,3vw,2.8rem)]">What this project does, from start to end</h2>
              <p className="section-copy mt-4 text-base">
                The platform begins with onboarding and authentication, moves into course and material management, supports planning and revision with AI, and closes the loop with accountability through tasks, analytics, and community.
              </p>
            </div>
            <Link to="/login" className="app-button-primary px-6 py-4 text-sm">
              Enter the workspace
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Landing;
