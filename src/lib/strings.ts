// UI string table, keyed by `profile.locale`. English is the open-source
// default; German (`de`) is the EmAI hub. This is the home for chrome strings
// that aren't tracker labels (those live in `labels.ts`). Add keys here rather
// than inlining German in components — that's what makes the app reusable by
// other companies and locales.
//
// Brand words (the app/assistant name) are NOT here — they come from
// `profile.appName` / `profile.assistantName`. This table is locale only.

import { profile } from "./profile";

type Dict = {
  // board
  newTask: string;
  newTaskDialogDesc: string;
  doneOfTotal: (done: number, total: number) => string;
  statusOf: (id: string) => string;
  // shell / chrome
  connecting: string;
  redirectingTo: (host: string) => string;
  signOut: string;
  account: string;
  myProfile: string;
  switchProject: string;
  chooseProject: string;
  yourProjects: string;
  allProjects: string;
  current: string;
  showShortcuts: string;
  keyboardShortcuts: string;
  storedInPod: string;
  notMember: (webId: string) => string;
  noProjectYet: (webId: string) => string;
  accessManaged: string;
  noProjectSelected: string;
  noProjectHint: string;
  // login
  loginTagline: (appName: string) => string;
  loginTrust: string;
  loginCompleting: string;
  // command palette (⌘K)
  cmdOpen: string;
  cmdSearch: string;
  cmdTitle: string;
  cmdDesc: string;
  cmdPlaceholder: string;
  cmdEmpty: string;
  cmdNav: string;
  cmdCreateTask: string;
  cmdWorkPackages: string;
  cmdPeople: string;
  cmdTasks: string;
  cmdMeetings: string;
  // board (page chrome)
  boardLoadFailed: (e: unknown) => string;
  createFailed: (e: unknown) => string;
  readonlyAccess: string;
  whatToDo: string;
  descOptionalMarkdown: string;
  descPlaceholder: string;
  create: string;
  createdToast: (id: string) => string;
  movedTo: (id: string, state: string) => string;
  // landing
  landingFeatChatBlurb: (assistant: string) => string;
  landingFeatBoardBlurb: string;
  landingFeatTimelineBlurb: string;
  landingFeatMeetingsBlurb: string;
  landingFeatBriefingsBlurb: string;
  landingFeatTeamBlurb: string;
  landingSignalOss: string;
  landingSignalSovereign: string;
  landingSignalNoTracking: string;
  landingHeroTagline: (appName: string) => string;
  landingHeroLead: string;
  landingHeroFeatures: string;
  landingHeroLeadTail: string;
  landingHeroAccount: (appName: string) => string;
  landingOverview: string;
  landingMeet: (assistant: string) => string;
  landingMeetP1: (assistant: string) => string;
  landingAccountWord: (appName: string) => string;
  landingAccountP2: string;
  landingFunctions: string;
  landingAllInOne: string;
  landingPartners: string;
  landingBuiltTogether: string;
  landingFooterTrust: string;
  // issue sheet
  issueSaved: (id: string) => string;
  issueReadonly: string;
  issueSaveFailed: (e: unknown) => string;
  issueDiscarded: (id: string) => string;
  issueDiscardFailed: (e: unknown) => string;
  overdue: string;
  titleLabel: string;
  detailsOf: (id: string) => string;
  statusLabel: string;
  workPackage: string;
  assignee: string;
  dueDate: string;
  openTitle: (title: string) => string;
  openProfile: string;
  description: string;
  markdownSupported: string;
  noDescription: string;
  created: (date: string) => string;
  updated: (date: string) => string;
  cancel: string;
  save: string;
  discard: string;
  edit: string;
  // comments
  rightNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  commentDeleteFailed: (e: unknown) => string;
  deleteComment: string;
  deleteReply: string;
  reply: string;
  replyTo: (name: string) => string;
  comment: string;
  comments: string;
  loadingComments: string;
  noCommentsYetCanComment: string;
  noCommentsYet: string;
  writeComment: string;
  commentFailed: (e: unknown) => string;
  // keyboard shortcuts
  searchAndCommands: string;
  newTaskShortcut: string;
  sendMessageComment: string;
  closeDialog: string;
  thisOverview: string;
  shortcutsHint: string;
  // epic sheet
  epicStatusActive: string;
  epicStatusPlanned: string;
  epicStatusDone: string;
  overdueCount: (n: number) => string;
  tasksDoneOf: (done: number, total: number) => string;
  apProgress: string;
  tasks: string;
  noTasksInAp: string;
  createTaskIn: (id: string) => string;
  // meeting sheet
  past: string;
  upcoming: string;
  clock: string;
  agenda: string;
  downloadIcs: string;
  googleCalendar: string;
  // workspace shell
  wsOverview: string;
  wsBoard: string;
  wsCalendar: string;
  wsTeam: string;
  wsBriefings: string;
  // home overview page (src/app/page.tsx)
  openAria: (label: string) => string;
  profileOf: (name: string) => string;
  projectProgress: string;
  progressOf: (id: string) => string;
  statInProgress: string;
  statDone: string;
  daysRemaining: string;
  toBoard: string;
  nextMeeting: string;
  allMeetings: string;
  currentBriefing: string;
  allBriefings: string;
  noUpcomingMeeting: string;
  // workspace overview
  workspace: string;
  projects: string;
  openTasks: string;
  overdueLabel: string;
  participants: string;
  upcomingMeetings: string;
  openLabel: string;
  open: string;
  noMeeting: string;
  // workspace briefings
  draftsToApprove: (n: number) => string;
  noOpenDrafts: string;
  approve: string;
  lastPublished: string;
  noneYet: string;
  // briefings page
  briefingPublished: string;
  briefingPublishFailed: (e: unknown) => string;
  draft: string;
  openBriefingAsPage: string;
  openAsPage: string;
  publish: string;
  draftsPendingApproval: (assistant: string) => string;
  briefings: string;
  noBriefingsYet: (assistant: string) => string;
  unread: string;
  // meetings page
  feedUrlCopied: string;
  copyFeedUrl: string;
  subscribeCalendar: string;
  subscribeDesc: string;
  appleOutlook: string;
  subscribeViaWebcal: string;
  googleAndOthers: string;
  feedUrl: string;
  googleHowto: string;
  meetingsTitle: string;
  upcomingHeading: string;
  noUpcomingMeetings: string;
  pastHeading: string;
  addToCalendar: string;
  oclock: string;
  // timeline page
  weeksLeft: (n: number) => string;
  runtime: string;
  doneLabel: string;
  today: string;
  todayTitle: (date: string) => string;
  due: string;
  meeting: string;
  legendDue: string;
  legendOverdue: string;
  legendDone: string;
  legendMeeting: string;
  legendToday: string;
  legendInactive: string;
  epicInactive: string;
  epicInactiveTitle: string;
  zoomQuarter: string;
  zoomMonth: string;
  zoomWeek: string;
  timelinePrev: string;
  timelineNext: string;
  timelineToday: string;
  sortLabel: string;
  sortByStart: string;
  sortByName: string;
  sortByProgress: string;
  dueOn: (date: string, state: string) => string;
  // team page
  roleNow: (name: string, role: string) => string;
  inviteForbidden: string;
  inviteFailed: (e: unknown) => string;
  invitePartner: string;
  inviteDialogDesc: (appName: string, username: string) => string;
  usernamePlaceholder: string;
  username: string;
  displayName: string;
  usernameExample: string;
  nameExample: string;
  organization: string;
  role: string;
  roleGuestDesc: (role: string) => string;
  roleMemberDesc: (role: string) => string;
  roleOwnerDesc: (role: string) => string;
  invite: string;
  lastOwner: string;
  roleChangeFailed: (e: unknown) => string;
  memberRemoved: (name: string) => string;
  removeFailed: (e: unknown) => string;
  you: string;
  openCount: (n: number) => string;
  manageMember: (name: string) => string;
  changeRole: string;
  removeFromProject: string;
  removeMemberTitle: (name: string) => string;
  removeMemberDesc: (name: string, org: string) => string;
  remove: string;
  teamAndPartner: string;
  orgsAndPeople: (orgs: number, people: number) => string;
  assistantSubtitle: string;
  askAssistant: (assistant: string) => string;
  // person profile
  noMemberWithUsername: string;
  noTasksAssigned: string;
  organizedMeetings: string;
  // chat page
  chatSuggest1: string;
  chatSuggest2: string;
  chatSuggest3: string;
  chatSuggest4: string;
  assistantAiLabel: string;
  assistantThinking: (assistant: string) => string;
  assistantUnavailable: (assistant: string) => string;
  loadingConversation: string;
  askAssistantTitle: (assistant: string) => string;
  chatEmptyHint: (assistant: string) => string;
  assistantReplying: (assistant: string) => string;
  messageToAssistant: (assistant: string) => string;
  send: string;
  chatPrivacy: (assistant: string) => string;
};

const STRINGS: Record<"en" | "de", Dict> = {
  en: {
    newTask: "New task",
    newTaskDialogDesc: "Create a new task in the tracker",
    doneOfTotal: (done, total) => `${done} of ${total} done`,
    statusOf: (id) => `Status of ${id}`,
    connecting: "Connecting to your pod…",
    redirectingTo: (host) => `Redirecting to ${host}…`,
    signOut: "Sign out",
    account: "Account",
    myProfile: "My profile",
    switchProject: "Switch project",
    chooseProject: "Choose a project",
    yourProjects: "Your projects",
    allProjects: "All projects…",
    current: "current",
    showShortcuts: "Show keyboard shortcuts",
    keyboardShortcuts: "Keyboard shortcuts",
    storedInPod: "Stored in your pod",
    notMember: (webId) =>
      `Signed in as ${webId} — but this identity isn't a member of the project.`,
    noProjectYet: (webId) =>
      `Signed in as ${webId} — but not assigned to any project yet.`,
    accessManaged: "Access is managed by the workspace owner.",
    noProjectSelected: "No project selected",
    noProjectHint: "Pick a project from the switcher at the top to open its board, timeline and briefings.",
    loginTagline: (appName) => `${appName} · one login for the whole project.`,
    loginTrust:
      "Your data stays in your own pod — no tracking, no third parties.",
    loginCompleting: "Completing sign-in…",
    cmdOpen: "Open search and commands",
    cmdSearch: "Search…",
    cmdTitle: "Commands",
    cmdDesc: "Search and navigation",
    cmdPlaceholder: "Search pages, tasks or meetings…",
    cmdEmpty: "Nothing found.",
    cmdNav: "Navigation",
    cmdCreateTask: "Create a new task",
    cmdWorkPackages: "Work packages",
    cmdPeople: "People",
    cmdTasks: "Tasks",
    cmdMeetings: "Meetings",
    boardLoadFailed: (e) => `Loading board failed: ${e}`,
    createFailed: (e) => `Creating failed: ${e}`,
    readonlyAccess: "Read-only access",
    whatToDo: "What needs to be done?",
    descOptionalMarkdown: "Description (optional, Markdown)",
    descPlaceholder: "Context, acceptance criteria, links…",
    create: "Create",
    createdToast: (id) => `${id} created`,
    movedTo: (id, state) => `${id} → ${state}`,
    landingFeatChatBlurb: (assistant) =>
      `Ask ${assistant} — the project assistant knows every status.`,
    landingFeatBoardBlurb: "Tasks and work packages as a Kanban, always current.",
    landingFeatTimelineBlurb: "Milestones and deadlines at a glance.",
    landingFeatMeetingsBlurb: "Every meeting with agenda and minutes in one place.",
    landingFeatBriefingsBlurb: "Weekly summary, generated automatically.",
    landingFeatTeamBlurb: "Who does what — roles and profiles in the project.",
    landingSignalOss: "Open-source AI",
    landingSignalSovereign: "Sovereign in Europe",
    landingSignalNoTracking: "No tracking",
    landingHeroTagline: (appName) => `Project intelligence · ${appName}`,
    landingHeroLead: "One mind for the whole project.",
    landingHeroFeatures: "Chat, board, timeline, meetings and briefings",
    landingHeroLeadTail: "— bundled in one place, one login for the whole team.",
    landingHeroAccount: (appName) =>
      `One ${appName} account for everything. Your data stays in your own pod — no third parties, no tracking. You keep control.`,
    landingOverview: "Overview",
    landingMeet: (assistant) => `Meet ${assistant}`,
    landingMeetP1: (assistant) =>
      `${assistant} is your AI project mind. It knows every task, every meeting and every decision — and has the answer ready before you go looking. Instead of scattering knowledge across emails, chats and tools, ${assistant} keeps it all together in one place and always up to date.`,
    landingAccountWord: (appName) => `One ${appName} account`,
    landingAccountP2:
      "gets you in — no tool sprawl, no password chaos. Your data stays in your own pod: no tracking, no third parties. You keep control of your project.",
    landingFunctions: "Features",
    landingAllInOne: "Everything for the project, in one place",
    landingPartners: "Partners",
    landingBuiltTogether: "Built together",
    landingFooterTrust: "Data stays in your pod · no tracking",
    issueSaved: (id) => `${id} saved`,
    issueReadonly: "No permission — your access is read-only.",
    issueSaveFailed: (e) => `Saving failed: ${e}`,
    issueDiscarded: (id) => `${id} discarded`,
    issueDiscardFailed: (e) => `Discarding failed: ${e}`,
    overdue: "overdue",
    titleLabel: "Title",
    detailsOf: (id) => `Details for ${id}`,
    statusLabel: "Status",
    workPackage: "Work package",
    assignee: "Assignee",
    dueDate: "Due on",
    openTitle: (title) => `Open ${title}`,
    openProfile: "Open profile",
    description: "Description",
    markdownSupported: "Markdown is supported.",
    noDescription: "No description.",
    created: (date) => `Created ${date}`,
    updated: (date) => `· Updated ${date}`,
    cancel: "Cancel",
    save: "Save",
    discard: "Discard",
    edit: "Edit",
    rightNow: "just now",
    minutesAgo: (n) => `${n} min ago`,
    hoursAgo: (n) => `${n} h ago`,
    commentDeleteFailed: (e) => `Deleting failed: ${e}`,
    deleteComment: "Delete comment",
    deleteReply: "Delete reply",
    reply: "Reply",
    replyTo: (name) => `Reply to ${name}…`,
    comment: "Comment",
    comments: "Comments",
    loadingComments: "Loading comments…",
    noCommentsYetCanComment: "No comments yet — write the first one.",
    noCommentsYet: "No comments yet.",
    writeComment: "Write a comment… (Markdown, ⌘↵ to send)",
    commentFailed: (e) => `Comment failed: ${e}`,
    searchAndCommands: "Search & commands",
    newTaskShortcut: "Create a new task",
    sendMessageComment: "Send message / comment",
    closeDialog: "Close dialog or detail view",
    thisOverview: "This overview",
    shortcutsHint: "The whole hub can be operated without a mouse.",
    epicStatusActive: "active",
    epicStatusPlanned: "planned",
    epicStatusDone: "done",
    overdueCount: (n) => `${n} overdue`,
    tasksDoneOf: (done, total) => `${done} of ${total} tasks done`,
    apProgress: "Work package progress",
    tasks: "Tasks",
    noTasksInAp: "No tasks in this work package yet.",
    createTaskIn: (id) => `Add task in ${id}`,
    past: "past",
    upcoming: "upcoming",
    clock: "",
    agenda: "Agenda",
    downloadIcs: "Download .ics",
    googleCalendar: "Google Calendar",
    wsOverview: "Overview",
    wsBoard: "Board",
    wsCalendar: "Calendar",
    wsTeam: "Team",
    wsBriefings: "Briefings",
    workspace: "Workspace",
    projects: "Projects",
    openAria: (label) => `Open ${label}`,
    profileOf: (name) => `Profile of ${name}`,
    projectProgress: "Project progress",
    progressOf: (id) => `${id} progress`,
    statInProgress: "In progress",
    statDone: "Done",
    daysRemaining: "Days remaining",
    toBoard: "To the board",
    nextMeeting: "Next meeting",
    allMeetings: "All meetings",
    currentBriefing: "Current briefing",
    allBriefings: "All briefings",
    noUpcomingMeeting: "No upcoming meeting.",
    openTasks: "Open tasks",
    overdueLabel: "Overdue",
    participants: "Participants",
    upcomingMeetings: "Upcoming meetings",
    openLabel: "Open",
    open: "open",
    noMeeting: "no meeting",
    draftsToApprove: (n) =>
      `${n} draft${n === 1 ? "" : "s"} to approve`,
    noOpenDrafts: "No open drafts.",
    approve: "Approve",
    lastPublished: "Last published",
    noneYet: "— none yet —",
    briefingPublished: "Briefing published — visible to all partners.",
    briefingPublishFailed: (e) => `Publishing failed: ${e}`,
    draft: "Draft",
    openBriefingAsPage: "Open briefing as page",
    openAsPage: "Open as page",
    publish: "Publish",
    draftsPendingApproval: (assistant) =>
      `Drafts — pending approval (visible to ${assistant} only)`,
    briefings: "Briefings",
    noBriefingsYet: (assistant) =>
      `No briefings published yet — ${assistant} writes a draft every Monday for approval.`,
    unread: "unread",
    feedUrlCopied: "Feed URL copied",
    copyFeedUrl: "Copy feed URL",
    subscribeCalendar: "Subscribe to calendar",
    subscribeDesc:
      "All project meetings as a live feed — new and changed meetings appear automatically in your calendar.",
    appleOutlook: "Apple Calendar / Outlook",
    subscribeViaWebcal: "Subscribe via webcal",
    googleAndOthers: "Google Calendar & others (via URL)",
    feedUrl: "Feed URL",
    googleHowto:
      "In Google Calendar: Other calendars → “From URL” → paste this address.",
    meetingsTitle: "Meetings",
    upcomingHeading: "Upcoming",
    noUpcomingMeetings: "No upcoming meetings.",
    pastHeading: "Past",
    addToCalendar: "Add to calendar",
    oclock: "",
    weeksLeft: (n) => `${n} weeks left`,
    runtime: "Runtime",
    doneLabel: "Done",
    today: "Today",
    todayTitle: (date) => `Today: ${date}`,
    due: "due",
    meeting: "Meeting",
    legendDue: "due",
    legendOverdue: "overdue",
    legendDone: "done",
    legendMeeting: "meeting",
    legendToday: "today",
    legendInactive: "inactive / future",
    epicInactive: "inactive",
    epicInactiveTitle: "Not started — no dates yet; starts when its first task moves to In progress",
    zoomQuarter: "Quarter",
    zoomMonth: "Month",
    zoomWeek: "Week",
    timelinePrev: "Earlier",
    timelineNext: "Later",
    timelineToday: "Today",
    sortLabel: "Sort",
    sortByStart: "By start",
    sortByName: "By name",
    sortByProgress: "By progress",
    dueOn: (date, state) => `due ${date} · ${state}`,
    roleNow: (name, role) => `${name} is now ${role}`,
    inviteForbidden: "No permission — only owners manage participants.",
    inviteFailed: (e) => `Inviting failed: ${e}`,
    invitePartner: "Invite partner",
    inviteDialogDesc: (appName, username) =>
      `Creates the project membership and recompiles the access rights. The pod account ${username} is provisioned separately by ${appName}.`,
    usernamePlaceholder: "<username>",
    username: "Username",
    displayName: "Display name",
    usernameExample: "e.g. maria",
    nameExample: "Maria Sample",
    organization: "Organization",
    role: "Role",
    roleGuestDesc: (role) => `${role} — reads briefings, board, timeline`,
    roleMemberDesc: (role) => `${role} — works actively in the project`,
    roleOwnerDesc: (role) => `${role} — manages project and participants`,
    invite: "Invite",
    lastOwner: "The last owner cannot be demoted.",
    roleChangeFailed: (e) => `Changing role failed: ${e}`,
    memberRemoved: (name) => `${name} was removed from the project`,
    removeFailed: (e) => `Removing failed: ${e}`,
    you: "you",
    openCount: (n) => `${n} open`,
    manageMember: (name) => `Manage ${name}`,
    changeRole: "Change role",
    removeFromProject: "Remove from project",
    removeMemberTitle: (name) => `Remove ${name}?`,
    removeMemberDesc: (name, org) =>
      `${name} (${org}) immediately loses access to the project — the access rights are recompiled. The membership can be re-created at any time.`,
    remove: "Remove",
    teamAndPartner: "Team & Partners",
    orgsAndPeople: (orgs, people) =>
      `${orgs} organizations · ${people} people`,
    assistantSubtitle: "Project assistant · answers questions from the project data",
    askAssistant: (assistant) => `Ask ${assistant}`,
    noMemberWithUsername: "No project member with the username",
    noTasksAssigned: "No tasks assigned.",
    organizedMeetings: "Organized meetings",
    chatSuggest1: "What's currently open?",
    chatSuggest2: "When is the next meeting?",
    chatSuggest3: "What's the status of AP2?",
    chatSuggest4: "What's the difference between pi0 and OpenVLA?",
    assistantAiLabel: "AI assistant",
    assistantThinking: (assistant) => `${assistant} is thinking`,
    assistantUnavailable: (assistant) =>
      `${assistant} is currently unreachable — the AI provider is briefly overloaded. Try again in a moment.`,
    loadingConversation: "Loading conversation…",
    askAssistantTitle: (assistant) => `Ask ${assistant} about the project`,
    chatEmptyHint: () =>
      "Tasks, meetings, status or specialist questions — the assistant answers from the live data of the project pod.",
    assistantReplying: (assistant) => `${assistant} is replying…`,
    messageToAssistant: (assistant) => `Message to ${assistant}…`,
    send: "Send",
    chatPrivacy: (assistant) =>
      `This conversation is private — visible only to you. ${assistant} can move tasks when you ask it to.`,
  },
  de: {
    newTask: "Neue Aufgabe",
    newTaskDialogDesc: "Neue Aufgabe im Tracker anlegen",
    doneOfTotal: (done, total) => `${done} von ${total} erledigt`,
    statusOf: (id) => `Status von ${id}`,
    connecting: "Verbinde mit deinem Pod…",
    redirectingTo: (host) => `Weiterleitung zu ${host}…`,
    signOut: "Abmelden",
    account: "Konto",
    myProfile: "Mein Profil",
    switchProject: "Projekt wechseln",
    chooseProject: "Projekt wählen",
    yourProjects: "Deine Projekte",
    allProjects: "Alle Projekte…",
    current: "aktuell",
    showShortcuts: "Tastaturkürzel anzeigen",
    keyboardShortcuts: "Tastaturkürzel",
    storedInPod: "Daten liegen in deinem Pod",
    notMember: (webId) =>
      `Angemeldet als ${webId} — aber diese Identität ist kein Mitglied des Projekts.`,
    noProjectYet: (webId) =>
      `Angemeldet als ${webId} — aber noch keinem Projekt zugeordnet.`,
    accessManaged: "Zugang vergibt der Workspace-Inhaber.",
    noProjectSelected: "Kein Projekt ausgewählt",
    noProjectHint: "Wähle oben im Umschalter ein Projekt, um Board, Timeline und Briefings zu öffnen.",
    loginTagline: (appName) => `${appName} · ein Login für das ganze Projekt.`,
    loginTrust:
      "Alle Daten bleiben in deinem Pod — kein Tracking, keine Drittanbieter.",
    loginCompleting: "Anmeldung wird abgeschlossen…",
    cmdOpen: "Suche und Befehle öffnen",
    cmdSearch: "Suchen…",
    cmdTitle: "Befehle",
    cmdDesc: "Suche und Navigation",
    cmdPlaceholder: "Seite, Aufgabe oder Termin suchen…",
    cmdEmpty: "Nichts gefunden.",
    cmdNav: "Navigation",
    cmdCreateTask: "Neue Aufgabe anlegen",
    cmdWorkPackages: "Arbeitspakete",
    cmdPeople: "Personen",
    cmdTasks: "Aufgaben",
    cmdMeetings: "Termine",
    boardLoadFailed: (e) => `Board laden fehlgeschlagen: ${e}`,
    createFailed: (e) => `Anlegen fehlgeschlagen: ${e}`,
    readonlyAccess: "Lesender Zugang",
    whatToDo: "Was ist zu tun?",
    descOptionalMarkdown: "Beschreibung (optional, Markdown)",
    descPlaceholder: "Kontext, Akzeptanzkriterien, Links…",
    create: "Anlegen",
    createdToast: (id) => `${id} angelegt`,
    movedTo: (id, state) => `${id} → ${state}`,
    landingFeatChatBlurb: (assistant) =>
      `Frag ${assistant} — der Projektassistent kennt jeden Stand.`,
    landingFeatBoardBlurb: "Aufgaben und Arbeitspakete als Kanban, immer aktuell.",
    landingFeatTimelineBlurb: "Meilensteine und Fristen auf einen Blick.",
    landingFeatMeetingsBlurb: "Alle Meetings mit Agenda und Protokoll an einem Ort.",
    landingFeatBriefingsBlurb: "Wöchentliche Zusammenfassung, automatisch erstellt.",
    landingFeatTeamBlurb: "Wer macht was — Rollen und Profile im Projekt.",
    landingSignalOss: "Open-Source KI",
    landingSignalSovereign: "Souverän in Europa",
    landingSignalNoTracking: "Kein Tracking",
    landingHeroTagline: (appName) => `Projekt-Intelligenz · ${appName}`,
    landingHeroLead: "Ein Kopf für das ganze Projekt.",
    landingHeroFeatures: "Chat, Board, Timeline, Termine und Briefings",
    landingHeroLeadTail: "— gebündelt an einem Ort, ein Login fürs ganze Team.",
    landingHeroAccount: (appName) =>
      `Ein ${appName}-Account für alles. Eure Daten bleiben in eurem eigenen Pod — keine Drittanbieter, kein Tracking. Die Hoheit bleibt bei euch.`,
    landingOverview: "Überblick",
    landingMeet: (assistant) => `Lern ${assistant} kennen`,
    landingMeetP1: (assistant) =>
      `${assistant} ist euer KI-Projektkopf. Er kennt jede Aufgabe, jeden Termin und jede Entscheidung — und hat die Antwort parat, bevor ihr lange suchen müsst. Statt Wissen über E-Mails, Chats und Tools zu verstreuen, hält ${assistant} alles an einem Ort zusammen und immer auf dem neuesten Stand.`,
    landingAccountWord: (appName) => `Ein ${appName}-Account`,
    landingAccountP2:
      "bringt euch rein — keine Tool-Sammlung, kein Passwort-Chaos. Eure Daten bleiben in eurem eigenen Pod: kein Tracking, keine Drittanbieter. Die Hoheit über euer Projekt bleibt bei euch.",
    landingFunctions: "Funktionen",
    landingAllInOne: "Alles fürs Projekt, an einem Ort",
    landingPartners: "Partner",
    landingBuiltTogether: "Gemeinsam gebaut",
    landingFooterTrust: "Daten liegen in deinem Pod · kein Tracking",
    issueSaved: (id) => `${id} gespeichert`,
    issueReadonly: "Keine Berechtigung — dein Zugang ist lesend.",
    issueSaveFailed: (e) => `Speichern fehlgeschlagen: ${e}`,
    issueDiscarded: (id) => `${id} verworfen`,
    issueDiscardFailed: (e) => `Verwerfen fehlgeschlagen: ${e}`,
    overdue: "überfällig",
    titleLabel: "Titel",
    detailsOf: (id) => `Details zu ${id}`,
    statusLabel: "Status",
    workPackage: "Arbeitspaket",
    assignee: "Zuständig",
    dueDate: "Fällig am",
    openTitle: (title) => `${title} öffnen`,
    openProfile: "Profil öffnen",
    description: "Beschreibung",
    markdownSupported: "Markdown wird unterstützt.",
    noDescription: "Keine Beschreibung.",
    created: (date) => `Erstellt ${date}`,
    updated: (date) => `· Aktualisiert ${date}`,
    cancel: "Abbrechen",
    save: "Speichern",
    discard: "Verwerfen",
    edit: "Bearbeiten",
    rightNow: "gerade eben",
    minutesAgo: (n) => `vor ${n} Min.`,
    hoursAgo: (n) => `vor ${n} Std.`,
    commentDeleteFailed: (e) => `Löschen fehlgeschlagen: ${e}`,
    deleteComment: "Kommentar löschen",
    deleteReply: "Antwort löschen",
    reply: "Antworten",
    replyTo: (name) => `Antwort an ${name}…`,
    comment: "Kommentieren",
    comments: "Kommentare",
    loadingComments: "Lade Kommentare…",
    noCommentsYetCanComment: "Noch keine Kommentare — schreib den ersten.",
    noCommentsYet: "Noch keine Kommentare.",
    writeComment: "Kommentar schreiben… (Markdown, ⌘↵ zum Senden)",
    commentFailed: (e) => `Kommentar fehlgeschlagen: ${e}`,
    searchAndCommands: "Suche & Befehle",
    newTaskShortcut: "Neue Aufgabe anlegen",
    sendMessageComment: "Nachricht / Kommentar senden",
    closeDialog: "Dialog oder Detailansicht schließen",
    thisOverview: "Diese Übersicht",
    shortcutsHint: "Der ganze Hub lässt sich ohne Maus bedienen.",
    epicStatusActive: "aktiv",
    epicStatusPlanned: "geplant",
    epicStatusDone: "abgeschlossen",
    overdueCount: (n) => `${n} überfällig`,
    tasksDoneOf: (done, total) => `${done} von ${total} Aufgaben erledigt`,
    apProgress: "AP-Fortschritt",
    tasks: "Aufgaben",
    noTasksInAp: "Noch keine Aufgaben in diesem Arbeitspaket.",
    createTaskIn: (id) => `Aufgabe in ${id} anlegen`,
    past: "vergangen",
    upcoming: "anstehend",
    clock: "Uhr",
    agenda: "Agenda",
    downloadIcs: ".ics herunterladen",
    googleCalendar: "Google Kalender",
    wsOverview: "Übersicht",
    wsBoard: "Board",
    wsCalendar: "Kalender",
    wsTeam: "Team",
    wsBriefings: "Briefings",
    workspace: "Workspace",
    projects: "Projekte",
    openAria: (label) => `${label} öffnen`,
    profileOf: (name) => `Profil von ${name}`,
    projectProgress: "Projektfortschritt",
    progressOf: (id) => `${id} Fortschritt`,
    statInProgress: "In Arbeit",
    statDone: "Erledigt",
    daysRemaining: "Tage Restlaufzeit",
    toBoard: "Zum Board",
    nextMeeting: "Nächstes Meeting",
    allMeetings: "Alle Termine",
    currentBriefing: "Aktuelles Briefing",
    allBriefings: "Alle Briefings",
    noUpcomingMeeting: "Kein anstehendes Meeting.",
    openTasks: "Offene Aufgaben",
    overdueLabel: "Überfällig",
    participants: "Beteiligte",
    upcomingMeetings: "Anstehende Termine",
    openLabel: "Offen",
    open: "offen",
    noMeeting: "kein Termin",
    draftsToApprove: (n) =>
      `${n} Entwurf${n === 1 ? "" : "e"} zur Freigabe`,
    noOpenDrafts: "Keine offenen Entwürfe.",
    approve: "Freigeben",
    lastPublished: "Zuletzt veröffentlicht",
    noneYet: "— noch keins —",
    briefingPublished: "Briefing veröffentlicht — für alle Partner sichtbar.",
    briefingPublishFailed: (e) => `Veröffentlichen fehlgeschlagen: ${e}`,
    draft: "Entwurf",
    openBriefingAsPage: "Briefing als Seite öffnen",
    openAsPage: "Als Seite öffnen",
    publish: "Veröffentlichen",
    draftsPendingApproval: (assistant) =>
      `Entwürfe — Freigabe ausstehend (nur für ${assistant} sichtbar)`,
    briefings: "Briefings",
    noBriefingsYet: (assistant) =>
      `Noch keine Briefings veröffentlicht — ${assistant} erstellt jeden Montag einen Entwurf zur Freigabe.`,
    unread: "ungelesen",
    feedUrlCopied: "Feed-URL kopiert",
    copyFeedUrl: "Feed-URL kopieren",
    subscribeCalendar: "Kalender abonnieren",
    subscribeDesc:
      "Alle Projekttermine als Live-Feed — neue und geänderte Termine erscheinen automatisch in deinem Kalender.",
    appleOutlook: "Apple Kalender / Outlook",
    subscribeViaWebcal: "Per webcal abonnieren",
    googleAndOthers: "Google Kalender & andere (per URL)",
    feedUrl: "Feed-URL",
    googleHowto:
      "In Google Kalender: Weitere Kalender → „Per URL\" → diese Adresse einfügen.",
    meetingsTitle: "Termine",
    upcomingHeading: "Anstehend",
    noUpcomingMeetings: "Keine anstehenden Termine.",
    pastHeading: "Vergangen",
    addToCalendar: "Zum Kalender hinzufügen",
    oclock: "Uhr",
    weeksLeft: (n) => `noch ${n} Wochen`,
    runtime: "Laufzeit",
    doneLabel: "Erledigt",
    today: "Heute",
    todayTitle: (date) => `Heute: ${date}`,
    due: "fällig",
    meeting: "Meeting",
    legendDue: "fällig",
    legendOverdue: "überfällig",
    legendDone: "erledigt",
    legendMeeting: "Meeting",
    legendToday: "heute",
    legendInactive: "inaktiv / künftig",
    epicInactive: "inaktiv",
    epicInactiveTitle: "Noch nicht gestartet — keine Daten; startet, sobald die erste Aufgabe auf In Arbeit wechselt",
    zoomQuarter: "Quartal",
    zoomMonth: "Monat",
    zoomWeek: "Woche",
    timelinePrev: "Früher",
    timelineNext: "Später",
    timelineToday: "Heute",
    sortLabel: "Sortierung",
    sortByStart: "Nach Start",
    sortByName: "Nach Name",
    sortByProgress: "Nach Fortschritt",
    dueOn: (date, state) => `fällig ${date} · ${state}`,
    roleNow: (name, role) => `${name} ist jetzt ${role}`,
    inviteForbidden: "Keine Berechtigung — nur Owner verwalten Teilnehmer.",
    inviteFailed: (e) => `Einladen fehlgeschlagen: ${e}`,
    invitePartner: "Partner einladen",
    inviteDialogDesc: (appName, username) =>
      `Legt die Mitgliedschaft im Projekt an und kompiliert die Zugriffsrechte neu. Das Pod-Konto ${username} vergibt ${appName} separat.`,
    usernamePlaceholder: "<benutzername>",
    username: "Benutzername",
    displayName: "Anzeigename",
    usernameExample: "z. B. maria",
    nameExample: "Maria Muster",
    organization: "Organisation",
    role: "Rolle",
    roleGuestDesc: (role) => `${role} — liest Briefings, Board, Timeline`,
    roleMemberDesc: (role) => `${role} — arbeitet aktiv im Projekt`,
    roleOwnerDesc: (role) => `${role} — verwaltet Projekt und Teilnehmer`,
    invite: "Einladen",
    lastOwner: "Der letzte Owner kann nicht herabgestuft werden.",
    roleChangeFailed: (e) => `Rolle ändern fehlgeschlagen: ${e}`,
    memberRemoved: (name) => `${name} wurde aus dem Projekt entfernt`,
    removeFailed: (e) => `Entfernen fehlgeschlagen: ${e}`,
    you: "du",
    openCount: (n) => `${n} offen`,
    manageMember: (name) => `${name} verwalten`,
    changeRole: "Rolle ändern",
    removeFromProject: "Aus Projekt entfernen",
    removeMemberTitle: (name) => `${name} entfernen?`,
    removeMemberDesc: (name, org) =>
      `${name} (${org}) verliert sofort den Zugang zum Projekt — die Zugriffsrechte werden neu kompiliert. Die Mitgliedschaft kann jederzeit wieder angelegt werden.`,
    remove: "Entfernen",
    teamAndPartner: "Team & Partner",
    orgsAndPeople: (orgs, people) =>
      `${orgs} Organisationen · ${people} Personen`,
    assistantSubtitle: "Projekt-Assistent · beantwortet Fragen aus den Projektdaten",
    askAssistant: (assistant) => `${assistant} fragen`,
    noMemberWithUsername: "Kein Projektmitglied mit dem Benutzernamen",
    noTasksAssigned: "Keine Aufgaben zugewiesen.",
    organizedMeetings: "Organisierte Termine",
    chatSuggest1: "Was ist aktuell offen?",
    chatSuggest2: "Wann ist das nächste Meeting?",
    chatSuggest3: "Wie ist der Stand bei AP2?",
    chatSuggest4: "Was ist der Unterschied zwischen pi0 und OpenVLA?",
    assistantAiLabel: "KI-Assistent",
    assistantThinking: (assistant) => `${assistant} denkt nach`,
    assistantUnavailable: (assistant) =>
      `${assistant} ist gerade nicht erreichbar — der KI-Anbieter ist kurzzeitig überlastet. Versuch es gleich noch einmal.`,
    loadingConversation: "Lade Unterhaltung…",
    askAssistantTitle: (assistant) => `Frag ${assistant} zum Projekt`,
    chatEmptyHint: (assistant) =>
      `Aufgaben, Termine, Status oder Physical-AI-Fachfragen — ${assistant} antwortet aus den Live-Daten des Projekt-Pods.`,
    assistantReplying: (assistant) => `${assistant} antwortet…`,
    messageToAssistant: (assistant) => `Nachricht an ${assistant}…`,
    send: "Senden",
    chatPrivacy: (assistant) =>
      `Unterhaltung ist privat — sichtbar nur für dich. ${assistant} kann Aufgaben verschieben, wenn du es schreibst.`,
  },
};

export const t: Dict = STRINGS[profile.locale];

/** BCP-47 tag for `Intl`/`toLocaleDateString` calls, derived from the locale. */
export const dateLocale = profile.locale === "de" ? "de-DE" : "en-US";
