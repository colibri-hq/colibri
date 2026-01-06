<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { removePaginationParametersFromUrl, trpc } from '$lib/trpc/client';
  import { Button, Dialog, Icon, Tabs } from '@colibri-hq/ui';
  import { error as notifyError, success } from '$lib/notifications';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  import Gravatar from 'svelte-gravatar';
  import type {
    CommentReport,
    CommentWithUserAndReactions,
    ModerationLogEntry,
  } from '@colibri-hq/sdk/types';
  import { SvelteSet } from 'svelte/reactivity';
  import ModerationStatistics from '$lib/components/Moderation/ModerationStatistics.svelte';

  dayjs.extend(relativeTime);

  // Extended types for UI display
  type Report = CommentReport;
  type HiddenComment = CommentWithUserAndReactions & {
    hidden_at?: string | Date | null;
    hidden_reason?: string | null;
  };

  type ResolutionFilter = 'all' | 'pending' | 'dismissed' | 'hidden' | 'deleted';

  const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
  const DEFAULT_PAGE_SIZE = 20;
  const ACTIVITY_PAGE_SIZE = 25;

  const tabs = {
    reports: 'Reports',
    hidden: 'Hidden Comments',
    activity: 'Activity Log',
  };
  type TabSlug = keyof typeof tabs;

  // Read initial state from URL
  function getInitialTab(): TabSlug {
    const tab = page.url.searchParams.get('tab');
    return tab && Object.keys(tabs).includes(tab) ? (tab as TabSlug) : 'reports';
  }

  function getInitialResolution(): ResolutionFilter {
    const res = page.url.searchParams.get('resolution');
    if (res && ['all', 'pending', 'dismissed', 'hidden', 'deleted'].includes(res)) {
      return res as ResolutionFilter;
    }
    return 'pending'; // Default to showing pending/unresolved
  }

  function getInitialSearch(): string {
    return page.url.searchParams.get('search') ?? '';
  }

  function getInitialDateFrom(): string {
    return page.url.searchParams.get('dateFrom') ?? '';
  }

  function getInitialDateTo(): string {
    return page.url.searchParams.get('dateTo') ?? '';
  }

  function getInitialPage(): number {
    const p = page.url.searchParams.get('page');
    return p ? Math.max(1, parseInt(p, 10)) : 1;
  }

  function getInitialPageSize(): number {
    const size = page.url.searchParams.get('pageSize');
    if (size) {
      const parsed = parseInt(size, 10);
      if (PAGE_SIZE_OPTIONS.includes(parsed as typeof PAGE_SIZE_OPTIONS[number])) {
        return parsed;
      }
    }
    return DEFAULT_PAGE_SIZE;
  }

  let initialActive = $derived(getInitialTab());

  // Filter state (synced with URL)
  let resolutionFilter = $state<ResolutionFilter>(getInitialResolution());
  let searchQuery = $state(getInitialSearch());
  let dateFrom = $state(getInitialDateFrom());
  let dateTo = $state(getInitialDateTo());
  let currentPage = $state(getInitialPage());
  let pageSize = $state(getInitialPageSize());
  let showFilters = $state(false);

  // Keyboard navigation state
  let focusedReportIndex = $state(-1);
  let keyboardNavEnabled = $state(true);

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  let debouncedSearch = $state(searchQuery);

  function handleSearchInput(value: string) {
    searchQuery = value;
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      debouncedSearch = value;
      currentPage = 1;
      updateUrlAndLoad();
    }, 300);
  }

  // State
  let reports = $state<Report[]>([]);
  let totalReports = $state(0);
  let hiddenComments = $state<HiddenComment[]>([]);
  let loadingReports = $state(true);
  let loadingHidden = $state(true);

  // Resolution modal state
  let showResolveModal = $state(false);
  let selectedReport = $state<Report | null>(null);
  let resolving = $state(false);

  // Hide modal state
  let showHideModal = $state(false);
  let selectedCommentToHide = $state<Report | null>(null);
  let hideReason = $state('');
  let hiding = $state(false);

  // Reopen modal state
  let showReopenModal = $state(false);
  let selectedReportToReopen = $state<Report | null>(null);
  let reopenUnhideComment = $state(false);
  let reopening = $state(false);

  // Change resolution modal state
  let showChangeResolutionModal = $state(false);
  let selectedReportToChange = $state<Report | null>(null);
  let newResolution = $state<'dismissed' | 'hidden' | 'deleted'>('dismissed');
  let changingResolution = $state(false);

  // Bulk selection state
  let selectedReportIds = $state<Set<string>>(new Set());
  let showBulkConfirmModal = $state(false);
  let bulkResolution = $state<'dismissed' | 'hidden' | 'deleted'>('dismissed');
  let bulkResolving = $state(false);

  // Derived: check if all pending reports are selected
  let pendingReports = $derived(reports.filter(r => !r.resolution));
  let allPendingSelected = $derived(
    pendingReports.length > 0 && pendingReports.every(r => selectedReportIds.has(r.id.toString())),
  );
  let someSelected = $derived(selectedReportIds.size > 0);

  // Activity log state
  let activityLog = $state<ModerationLogEntry[]>([]);
  let totalActivityEntries = $state(0);
  let loadingActivity = $state(true);
  let activityPage = $state(1);

  // Derived pagination values
  let totalPages = $derived(Math.max(1, Math.ceil(totalReports / pageSize)));
  let hasNextPage = $derived(currentPage < totalPages);
  let hasPrevPage = $derived(currentPage > 1);

  // Derived: focused report for keyboard navigation
  let focusedReport = $derived(focusedReportIndex >= 0 && focusedReportIndex < reports.length ?
    reports[focusedReportIndex] :
    null);

  // Activity log pagination
  let totalActivityPages = $derived(Math.max(1, Math.ceil(totalActivityEntries / ACTIVITY_PAGE_SIZE)));
  let hasNextActivityPage = $derived(activityPage < totalActivityPages);
  let hasPrevActivityPage = $derived(activityPage > 1);

  // Update URL with current filter state
  function updateUrl(tab?: TabSlug) {
    const newUrl = new URL(page.url);
    removePaginationParametersFromUrl(newUrl);

    if (tab) {
      newUrl.searchParams.set('tab', tab);
    }

    // Set or remove filter params
    if (resolutionFilter !== 'pending') {
      newUrl.searchParams.set('resolution', resolutionFilter);
    } else {
      newUrl.searchParams.delete('resolution');
    }

    if (debouncedSearch) {
      newUrl.searchParams.set('search', debouncedSearch);
    } else {
      newUrl.searchParams.delete('search');
    }

    if (dateFrom) {
      newUrl.searchParams.set('dateFrom', dateFrom);
    } else {
      newUrl.searchParams.delete('dateFrom');
    }

    if (dateTo) {
      newUrl.searchParams.set('dateTo', dateTo);
    } else {
      newUrl.searchParams.delete('dateTo');
    }

    if (currentPage > 1) {
      newUrl.searchParams.set('page', currentPage.toString());
    } else {
      newUrl.searchParams.delete('page');
    }

    if (pageSize !== DEFAULT_PAGE_SIZE) {
      newUrl.searchParams.set('pageSize', pageSize.toString());
    } else {
      newUrl.searchParams.delete('pageSize');
    }

    return goto(newUrl, { replaceState: true, keepFocus: true });
  }

  function updateUrlAndLoad() {
    updateUrl();
    loadReports();
  }

  function handleTabChange(tab: TabSlug) {
    // Reset filters when changing tabs
    resolutionFilter = 'pending';
    searchQuery = '';
    debouncedSearch = '';
    dateFrom = '';
    dateTo = '';
    currentPage = 1;
    updateUrl(tab);
  }

  // Load data on mount
  $effect(() => {
    loadReports();
    loadHiddenComments();
    loadActivityLog();
  });

  async function loadActivityLog() {
    loadingActivity = true;
    try {
      const result = await trpc(page).comments.getActivityLog.query({
        limit: ACTIVITY_PAGE_SIZE,
        offset: (activityPage - 1) * ACTIVITY_PAGE_SIZE,
      });
      activityLog = result.entries;
      totalActivityEntries = result.total;
    } catch (e) {
      console.error('Failed to load activity log', e);
    } finally {
      loadingActivity = false;
    }
  }

  function goToActivityPage(pageNum: number) {
    activityPage = pageNum;
    loadActivityLog();
  }

  function getActionLabel(actionType: string): string {
    switch (actionType) {
      case 'resolve_report':
        return 'Resolved report';
      case 'reopen_report':
        return 'Reopened report';
      case 'change_resolution':
        return 'Changed resolution';
      case 'hide_comment':
        return 'Hid comment';
      case 'unhide_comment':
        return 'Restored comment';
      case 'delete_comment':
        return 'Deleted comment';
      default:
        return actionType;
    }
  }

  function getActionIcon(actionType: string): string {
    switch (actionType) {
      case 'resolve_report':
        return 'gavel';
      case 'reopen_report':
        return 'refresh';
      case 'change_resolution':
        return 'swap_horiz';
      case 'hide_comment':
        return 'visibility_off';
      case 'unhide_comment':
        return 'visibility';
      case 'delete_comment':
        return 'delete';
      default:
        return 'info';
    }
  }

  function getActionColor(actionType: string): string {
    switch (actionType) {
      case 'resolve_report':
        return 'text-blue-600 dark:text-blue-400';
      case 'reopen_report':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'change_resolution':
        return 'text-purple-600 dark:text-purple-400';
      case 'hide_comment':
        return 'text-orange-600 dark:text-orange-400';
      case 'unhide_comment':
        return 'text-green-600 dark:text-green-400';
      case 'delete_comment':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  async function loadReports() {
    loadingReports = true;
    // Reset keyboard focus when loading new reports
    focusedReportIndex = -1;
    try {
      // Build query params based on filter state
      const params: {
        resolved?: boolean;
        resolution?: 'dismissed' | 'hidden' | 'deleted';
        search?: string;
        dateFrom?: string;
        dateTo?: string;
        limit: number;
        offset: number;
      } = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };

      // Handle resolution filter
      if (resolutionFilter === 'pending') {
        params.resolved = false;
      } else if (resolutionFilter === 'all') {
        // No filter - show all
      } else {
        params.resolution = resolutionFilter;
      }

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      if (dateFrom) {
        params.dateFrom = dateFrom;
      }

      if (dateTo) {
        params.dateTo = dateTo;
      }

      const result = await trpc(page).comments.getReports.query(params);
      reports = result.reports;
      totalReports = result.total;
    } catch (e) {
      notifyError('Failed to load reports', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      loadingReports = false;
    }
  }

  async function loadHiddenComments() {
    loadingHidden = true;
    try {
      hiddenComments = await trpc(page).comments.getHidden.query({ limit: 50 });
    } catch (e) {
      notifyError('Failed to load hidden comments', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      loadingHidden = false;
    }
  }

  function openResolveModal(report: Report) {
    selectedReport = report;
    showResolveModal = true;
  }

  function closeResolveModal() {
    showResolveModal = false;
    selectedReport = null;
  }

  async function resolveReport(resolution: 'dismissed' | 'hidden' | 'deleted') {
    if (!selectedReport) {
      return;
    }

    resolving = true;
    try {
      await trpc(page).comments.resolveReport.mutate({
        reportId: selectedReport.id.toString(),
        resolution,
      });

      success('Report resolved', {
        message: resolution === 'dismissed'
          ? 'The report has been dismissed.'
          : resolution === 'hidden'
            ? 'The comment has been hidden.'
            : 'The comment has been deleted.',
      });

      closeResolveModal();
      await loadReports();
      if (resolution === 'hidden') {
        await loadHiddenComments();
      }
    } catch (e) {
      notifyError('Failed to resolve report', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      resolving = false;
    }
  }

  function openHideModal(report: Report) {
    selectedCommentToHide = report;
    hideReason = '';
    showHideModal = true;
  }

  function closeHideModal() {
    showHideModal = false;
    selectedCommentToHide = null;
    hideReason = '';
  }

  async function hideComment() {
    if (!selectedCommentToHide || !hideReason.trim()) {
      return;
    }

    hiding = true;
    try {
      await trpc(page).comments.hide.mutate({
        commentId: selectedCommentToHide.comment_id.toString(),
        reason: hideReason.trim(),
      });

      success('Comment hidden');
      closeHideModal();
      await loadReports();
      await loadHiddenComments();
    } catch (e) {
      notifyError('Failed to hide comment', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      hiding = false;
    }
  }

  async function unhideComment(commentId: string) {
    try {
      await trpc(page).comments.unhide.mutate({ commentId });
      success('Comment restored');
      await loadHiddenComments();
    } catch (e) {
      notifyError('Failed to restore comment', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    }
  }

  // Reopen report functions
  function openReopenModal(report: Report) {
    selectedReportToReopen = report;
    // Default to unhiding if the comment was hidden by this report
    reopenUnhideComment = report.resolution === 'hidden';
    showReopenModal = true;
  }

  function closeReopenModal() {
    showReopenModal = false;
    selectedReportToReopen = null;
    reopenUnhideComment = false;
  }

  async function handleReopenReport() {
    if (!selectedReportToReopen) {
      return;
    }

    reopening = true;
    try {
      await trpc(page).comments.reopenReport.mutate({
        reportId: selectedReportToReopen.id.toString(),
        unhideComment: reopenUnhideComment,
      });

      success('Report reopened', {
        message: 'The report is now pending review again.',
      });

      closeReopenModal();
      await loadReports();
      if (reopenUnhideComment) {
        await loadHiddenComments();
      }
    } catch (e) {
      notifyError('Failed to reopen report', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      reopening = false;
    }
  }

  // Change resolution functions
  function openChangeResolutionModal(report: Report) {
    selectedReportToChange = report;
    // Default to a different resolution than the current one
    if (report.resolution === 'dismissed') {
      newResolution = 'hidden';
    } else if (report.resolution === 'hidden') {
      newResolution = 'deleted';
    } else {
      newResolution = 'dismissed';
    }
    showChangeResolutionModal = true;
  }

  function closeChangeResolutionModal() {
    showChangeResolutionModal = false;
    selectedReportToChange = null;
  }

  async function handleChangeResolution() {
    if (!selectedReportToChange || newResolution === selectedReportToChange.resolution) {
      return;
    }

    changingResolution = true;
    try {
      await trpc(page).comments.changeResolution.mutate({
        reportId: selectedReportToChange.id.toString(),
        newResolution: newResolution,
      });

      const resolutionLabel = newResolution === 'dismissed'
        ? 'dismissed'
        : newResolution === 'hidden'
          ? 'hidden'
          : 'deleted';

      success('Resolution changed', {
        message: `The report resolution has been changed to "${resolutionLabel}".`,
      });

      closeChangeResolutionModal();
      await loadReports();
      await loadHiddenComments();
    } catch (e) {
      notifyError('Failed to change resolution', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      changingResolution = false;
    }
  }

  function handleResolutionChange(value: string) {
    resolutionFilter = value as ResolutionFilter;
    currentPage = 1;
    updateUrlAndLoad();
  }

  function handleDateFromChange(value: string) {
    dateFrom = value;
    currentPage = 1;
    updateUrlAndLoad();
  }

  function handleDateToChange(value: string) {
    dateTo = value;
    currentPage = 1;
    updateUrlAndLoad();
  }

  function clearFilters() {
    resolutionFilter = 'pending';
    searchQuery = '';
    debouncedSearch = '';
    dateFrom = '';
    dateTo = '';
    currentPage = 1;
    updateUrlAndLoad();
  }

  function goToPage(pageNum: number) {
    currentPage = pageNum;
    updateUrlAndLoad();
  }

  function handlePageSizeChange(newSize: number) {
    pageSize = newSize;
    currentPage = 1; // Reset to first page when changing page size
    updateUrlAndLoad();
  }

  // Keyboard navigation functions
  function handleKeydown(event: KeyboardEvent) {
    // Don't handle shortcuts if user is typing in an input
    if (!keyboardNavEnabled) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    // Don't handle shortcuts if a modal is open
    if (showResolveModal || showReopenModal || showChangeResolutionModal || showBulkConfirmModal || showHideModal) {
      return;
    }

    switch (event.key) {
      case 'j': // Move down
        event.preventDefault();
        if (reports.length > 0) {
          focusedReportIndex = Math.min(focusedReportIndex + 1, reports.length - 1);
        }
        break;
      case 'k': // Move up
        event.preventDefault();
        if (reports.length > 0) {
          focusedReportIndex = Math.max(focusedReportIndex - 1, 0);
        }
        break;
      case ' ': // Toggle selection
        event.preventDefault();
        if (focusedReport && !focusedReport.resolution) {
          toggleReportSelection(focusedReport.id.toString());
        }
        break;
      case 'a': // Select all pending
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          toggleSelectAllPending();
        }
        break;
      case 'Enter': // Open action modal
        event.preventDefault();
        if (focusedReport && !focusedReport.resolution) {
          openResolveModal(focusedReport);
        }
        break;
      case 'd': // Dismiss
        event.preventDefault();
        if (focusedReport && !focusedReport.resolution) {
          selectedReport = focusedReport;
          resolveReport('dismissed');
        } else if (someSelected) {
          openBulkConfirmModal('dismissed');
        }
        break;
      case 'h': // Hide
        event.preventDefault();
        if (focusedReport && !focusedReport.resolution) {
          selectedReport = focusedReport;
          resolveReport('hidden');
        } else if (someSelected) {
          openBulkConfirmModal('hidden');
        }
        break;
      case 'x': // Delete
        event.preventDefault();
        if (focusedReport && !focusedReport.resolution) {
          selectedReport = focusedReport;
          showResolveModal = true;
        } else if (someSelected) {
          openBulkConfirmModal('deleted');
        }
        break;
      case 'Escape': // Clear selection / focus
        event.preventDefault();
        if (someSelected) {
          clearSelection();
        } else {
          focusedReportIndex = -1;
        }
        break;
      case '?': // Show keyboard shortcuts help
        if (event.shiftKey) {
          event.preventDefault();
          success('Keyboard Shortcuts', {
            message: 'j/k: Navigate • Space: Select • Enter: Action • d: Dismiss • h: Hide • x: Delete • Esc: Clear',
          });
        }
        break;
    }
  }

  // Bulk selection functions
  function toggleReportSelection(reportId: string) {
    const newSet = new SvelteSet(selectedReportIds);

    if (newSet.has(reportId)) {
      newSet.delete(reportId);
    } else {
      newSet.add(reportId);
    }

    selectedReportIds = newSet;
  }

  function toggleSelectAllPending() {
    selectedReportIds = allPendingSelected
      // Deselect all
      ? new Set()

      // Select all pending reports
      : new Set(pendingReports.map(({ id: { toString } }) => toString()));
  }

  function clearSelection() {
    selectedReportIds = new Set();
  }

  function openBulkConfirmModal(resolution: 'dismissed' | 'hidden' | 'deleted') {
    bulkResolution = resolution;
    showBulkConfirmModal = true;
  }

  function closeBulkConfirmModal() {
    showBulkConfirmModal = false;
  }

  async function handleBulkResolve() {
    if (selectedReportIds.size === 0) {
      return;
    }

    bulkResolving = true;
    try {
      const result = await trpc(page).comments.bulkResolveReports.mutate({
        reportIds: Array.from(selectedReportIds),
        resolution: bulkResolution,
      });

      const actionLabel = bulkResolution === 'dismissed'
        ? 'dismissed'
        : bulkResolution === 'hidden'
          ? 'hidden'
          : 'deleted';

      success(`Bulk action completed`, {
        message: `${result.resolved} report${result.resolved !== 1 ? 's' : ''} ${actionLabel}${result.failed > 0 ?
          `, ${result.failed} failed` :
          ''}.`,
      });

      closeBulkConfirmModal();
      clearSelection();
      await loadReports();
      if (bulkResolution === 'hidden') {
        await loadHiddenComments();
      }
      await loadActivityLog();
    } catch (e) {
      notifyError('Failed to resolve reports', {
        message: e instanceof Error ? e.message : 'An unexpected error occurred',
      });
    } finally {
      bulkResolving = false;
    }
  }

  function getResolutionBadgeClass(resolution: string | null) {
    switch (resolution) {
      case 'dismissed':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'hidden':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'deleted':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    }
  }

  // Check if any filters are active (besides the default)
  let hasActiveFilters = $derived(
    resolutionFilter !== 'pending' ||
    debouncedSearch !== '' ||
    dateFrom !== '' ||
    dateTo !== '',
  );
</script>

<svelte:head>
  <title>Content Moderation</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<article>
  <header class="mb-8">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-5xl font-bold font-serif">Content Moderation</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Review reported comments and manage hidden content.
        </p>
      </div>
      <button
        type="button"
        class="hidden sm:flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onclick={() => success('Keyboard Shortcuts', { message: 'j/k: Navigate • Space: Select • Enter: Action • d: Dismiss • h: Hide • x: Delete • Esc: Clear • Ctrl+A: Select All' })}
        title="Keyboard shortcuts"
      >
        <Icon name="keyboard" class="text-sm" />
        <span>Shift+?</span>
      </button>
    </div>
  </header>

  <!-- Statistics Dashboard -->
  <ModerationStatistics class="mb-6" />

  <Tabs
    {tabs}
    initialValue={initialActive}
    onChange={handleTabChange}
  >
    {#snippet reportsContent()}
      <div class="space-y-4">
        <!-- Filter bar -->
        <div class="space-y-3">
          <!-- Top row: Search and toggle -->
          <div class="flex items-center gap-3">
            <div class="flex-1 relative">
              <Icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search comment content..."
                value={searchQuery}
                oninput={(e) => handleSearchInput(e.currentTarget.value)}
                class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button variant="ghost" size="small" onclick={() => showFilters = !showFilters}>
              <Icon name="filter_list" class="mr-1" />
              Filters
              {#if hasActiveFilters}
                <span
                  class="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                  Active
                </span>
              {/if}
            </Button>
          </div>

          <!-- Collapsible filter panel -->
          {#if showFilters}
            <div
              class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- Resolution filter -->
                <div>
                  <label for="resolution-filter"
                         class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <select
                    id="resolution-filter"
                    value={resolutionFilter}
                    onchange={(e) => handleResolutionChange(e.currentTarget.value)}
                    class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  >
                    <option value="pending">Pending</option>
                    <option value="all">All Reports</option>
                    <option value="dismissed">Dismissed</option>
                    <option value="hidden">Hidden</option>
                    <option value="deleted">Deleted</option>
                  </select>
                </div>

                <!-- Date from -->
                <div>
                  <label for="date-from" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    From Date
                  </label>
                  <input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onchange={(e) => handleDateFromChange(e.currentTarget.value)}
                    class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  />
                </div>

                <!-- Date to -->
                <div>
                  <label for="date-to" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    To Date
                  </label>
                  <input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onchange={(e) => handleDateToChange(e.currentTarget.value)}
                    class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  />
                </div>
              </div>

              {#if hasActiveFilters}
                <div class="flex justify-end">
                  <Button variant="ghost" size="small" onclick={clearFilters}>
                    <Icon name="close" class="mr-1" />
                    Clear Filters
                  </Button>
                </div>
              {/if}
            </div>
          {/if}

          <!-- Results count and bulk selection -->
          <div class="flex items-center justify-between text-sm text-gray-500">
            <div class="flex items-center gap-3">
              {#if pendingReports.length > 0}
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    onchange={toggleSelectAllPending}
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm">Select all pending</span>
                </label>
              {/if}
              <span>
                {totalReports} report{totalReports !== 1 ? 's' : ''}
                {#if hasActiveFilters}
                  <span class="text-gray-400">(filtered)</span>
                {/if}
              </span>
            </div>
            {#if totalPages > 1}
              <span>Page {currentPage} of {totalPages}</span>
            {/if}
          </div>

          <!-- Bulk action bar -->
          {#if someSelected}
            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div class="flex items-center gap-2">
                <Icon name="check_box" class="text-blue-600" />
                <span class="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {selectedReportIds.size} report{selectedReportIds.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                  onclick={clearSelection}
                >
                  Clear
                </button>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="small" onclick={() => openBulkConfirmModal('dismissed')}>
                  <Icon name="close" class="sm:mr-1" />
                  <span class="hidden sm:inline">Dismiss All</span>
                  <span class="sm:hidden">Dismiss</span>
                </Button>
                <Button variant="ghost" size="small" onclick={() => openBulkConfirmModal('hidden')}>
                  <Icon name="visibility_off" class="sm:mr-1 text-yellow-600" />
                  <span class="hidden sm:inline">Hide All</span>
                  <span class="sm:hidden">Hide</span>
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  class="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onclick={() => openBulkConfirmModal('deleted')}
                >
                  <Icon name="delete" class="sm:mr-1" />
                  <span class="hidden sm:inline">Delete All</span>
                  <span class="sm:hidden">Delete</span>
                </Button>
              </div>
            </div>
          {/if}
        </div>

        {#if loadingReports}
          <!-- Reports skeleton -->
          <div class="space-y-4">
            {#each Array(3) as _, index (index)}
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <!-- Header skeleton -->
                <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="size-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div class="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div class="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
                <!-- Content skeleton -->
                <div class="p-4 space-y-4">
                  <div>
                    <div class="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div class="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
                  </div>
                  <div>
                    <div class="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div class="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
                  </div>
                </div>
                <!-- Action skeleton -->
                <div
                  class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                  <div class="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            {/each}
          </div>
        {:else if reports.length === 0}
          <div class="text-center py-12 text-gray-500 dark:text-gray-400">
            <Icon name="check_circle" class="text-4xl mb-2" />
            <p>No {resolutionFilter === 'pending' ? 'pending ' : ''}reports to review.</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each reports as report, index (report.id)}
              {@const isFocused = focusedReportIndex === index}
              {@const isSelected = selectedReportIds.has(report.id.toString())}
              <div
                class="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden transition-all {isFocused ? 'border-blue-400 dark:border-blue-500 shadow-md' : 'border-gray-200 dark:border-gray-700'} {isSelected ? 'ring-2 ring-blue-500' : ''}"
                role="article"
                tabindex={isFocused ? 0 : -1}>
                <!-- Report header -->
                <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      {#if !report.resolution}
                        <input
                          type="checkbox"
                          checked={selectedReportIds.has(report.id.toString())}
                          onchange={() => toggleReportSelection(report.id.toString())}
                          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onclick={(e: Event) => e.stopPropagation()}
                        />
                      {/if}
                      <Gravatar
                        class="h-6 w-6 rounded-full bg-gray-200"
                        email={report.reporter?.email}
                      />
                      <span class="text-sm font-medium group relative cursor-help"
                            title="{report.reporter?.name ?? 'Unknown user'} has made {report.reporter_total_reports ?? 1} report{(report.reporter_total_reports ?? 1) !== 1 ? 's' : ''} total">
                        {report.reporter?.name ?? 'Unknown user'}
                        {#if (report.reporter_total_reports ?? 0) > 1}
                          <span
                            class="ml-1 px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {report.reporter_total_reports} reports
                          </span>
                        {/if}
                      </span>
                      <span class="text-xs text-gray-500">
                        reported {dayjs(report.created_at).fromNow()}
                      </span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-xs font-medium {getResolutionBadgeClass(report.resolution)}">
                      {report.resolution ?? 'Pending'}
                    </span>
                  </div>
                </div>

                <!-- Report content -->
                <div class="p-4 space-y-4">
                  <!-- Reporter's reason -->
                  <div>
                    <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Report Reason
                    </h4>
                    <p
                      class="text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border-l-4 border-red-400">
                      {report.reason}
                    </p>
                  </div>

                  <!-- Original comment -->
                  {#if report.comment}
                    <div>
                      <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Reported Comment
                      </h4>
                      <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <div class="flex items-center gap-2 mb-2">
                          <Gravatar
                            class="h-5 w-5 rounded-full bg-gray-200"
                            email={report.comment.created_by?.email}
                          />
                          <span class="text-sm font-medium">
                            {report.comment.created_by?.name ?? 'Unknown user'}
                          </span>
                          <span class="text-xs text-gray-500">
                            {dayjs(report.comment.created_at).fromNow()}
                          </span>
                        </div>
                        <p class="text-sm text-gray-700 dark:text-gray-300">
                          {report.comment.content}
                        </p>
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- Actions -->
                {#if !report.resolution}
                  <div
                    class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-2">
                    <Button variant="ghost" size="small" onclick={() => openResolveModal(report)}>
                      <Icon name="gavel" class="mr-1" />
                      Take Action
                    </Button>
                  </div>
                {:else}
                  <div
                    class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                    <p class="text-xs text-gray-500">
                      Resolved by {report.resolver?.name ?? 'admin'} {dayjs(report.resolved_at).fromNow()}
                    </p>
                    <div class="flex items-center gap-2">
                      <Button variant="ghost" size="small" onclick={() => openChangeResolutionModal(report)}>
                        <Icon name="swap_horiz" class="mr-1" />
                        Change
                      </Button>
                      <Button variant="ghost" size="small" onclick={() => openReopenModal(report)}>
                        <Icon name="refresh" class="mr-1" />
                        Reopen
                      </Button>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <!-- Pagination -->
          {#if totalPages > 1 || pageSize !== DEFAULT_PAGE_SIZE}
            <div
              class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <!-- Page size selector -->
              <div class="flex items-center gap-2 text-sm text-gray-500">
                <span>Show</span>
                <select
                  onchange={({currentTarget}) => handlePageSizeChange(parseInt(currentTarget.value, 10))}
                  class="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                >
                  {#each PAGE_SIZE_OPTIONS as size (size)}
                    <option value={size} selected={size === pageSize}>{size}</option>
                  {/each}
                </select>
                <span>per page</span>
              </div>

              <!-- Page navigation -->
              {#if totalPages > 1}
                <div class="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="small"
                    onclick={() => goToPage(currentPage - 1)}
                    disabled={!hasPrevPage}
                  >
                    <Icon name="chevron_left" />
                    <span class="hidden sm:inline">Previous</span>
                  </Button>

                  <div class="flex items-center gap-1">
                    {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show pages around current page
                      let start = Math.max(1, currentPage - 2);
                      let end = Math.min(totalPages, start + 4);
                      start = Math.max(1, end - 4);
                      return start + i;
                    }).filter(p => p <= totalPages) as pageNum (pageNum)}
                      <button
                        class="px-3 py-1 text-sm rounded {pageNum === currentPage
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}"
                        onclick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    {/each}
                  </div>

                  <Button
                    variant="ghost"
                    size="small"
                    onclick={() => goToPage(currentPage + 1)}
                    disabled={!hasNextPage}
                  >
                    <span class="hidden sm:inline">Next</span>
                    <Icon name="chevron_right" />
                  </Button>
                </div>
              {/if}
            </div>
          {/if}
        {/if}
      </div>
    {/snippet}

    {#snippet hiddenContent()}
      <div class="space-y-4">
        <div class="flex items-center justify-end">
          <span class="text-sm text-gray-500">
            {hiddenComments.length} hidden comment{hiddenComments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {#if loadingHidden}
          <!-- Hidden comments skeleton -->
          <div class="space-y-4">
            {#each Array(3) as _, index (index)}
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <div class="p-4">
                  <div class="flex items-start gap-3">
                    <div class="size-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div class="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div class="h-5 w-14 bg-red-100 dark:bg-red-900/50 rounded animate-pulse"></div>
                      </div>
                      <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                      <div class="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                      <div class="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div class="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else if hiddenComments.length === 0}
          <div class="text-center py-12 text-gray-500 dark:text-gray-400">
            <Icon name="visibility" class="text-4xl mb-2" />
            <p>No hidden comments.</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each hiddenComments as comment (comment.id)}
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <div class="p-4">
                  <div class="flex items-start gap-3">
                    <Gravatar
                      class="h-8 w-8 rounded-full bg-gray-200"
                      email={comment.created_by?.email}
                    />
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium">
                          {comment.created_by?.name ?? 'Unknown user'}
                        </span>
                        <span class="text-xs text-gray-500">
                          {dayjs(comment.created_at).fromNow()}
                        </span>
                        <span
                          class="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                          Hidden
                        </span>
                      </div>
                      <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {comment.content}
                      </p>
                      {#if comment.hidden_reason}
                        <p class="text-xs text-gray-500 italic">
                          Hidden reason: {comment.hidden_reason}
                        </p>
                      {/if}
                    </div>
                    <Button variant="ghost" size="small" onclick={() => unhideComment(comment.id.toString())}>
                      <Icon name="visibility" class="mr-1" />
                      Restore
                    </Button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/snippet}

    {#snippet activityContent()}
      <div class="space-y-4">
        <div class="flex items-center justify-between text-sm text-gray-500">
          <span>
            {totalActivityEntries} action{totalActivityEntries !== 1 ? 's' : ''}
          </span>
          {#if totalActivityPages > 1}
            <span>Page {activityPage} of {totalActivityPages}</span>
          {/if}
        </div>

        {#if loadingActivity}
          <!-- Activity log skeleton -->
          <div class="space-y-3">
            {#each Array(4) as _, index (index)}
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div class="flex items-start gap-3">
                  <div class="size-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-2">
                      <div class="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div class="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div class="space-y-1 mt-2">
                      <div class="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div class="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div class="mt-2">
                      <div class="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else if activityLog.length === 0}
          <div class="text-center py-12 text-gray-500 dark:text-gray-400">
            <Icon name="history" class="text-4xl mb-2" />
            <p>No moderation activity yet.</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each activityLog as entry (entry.id)}
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div class="flex items-start gap-3">
                  <div
                    class="flex-shrink-0 size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Icon name={getActionIcon(entry.action_type)} class={getActionColor(entry.action_type)} />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-medium text-sm">
                        {entry.performer_name ?? 'Unknown admin'}
                      </span>
                      <span class="text-sm text-gray-600 dark:text-gray-400">
                        {getActionLabel(entry.action_type)}
                      </span>
                      <span class="text-xs text-gray-500">
                        {dayjs(entry.created_at).fromNow()}
                      </span>
                    </div>

                    {#if entry.details}
                      <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        {#if entry.details.resolution}
                          <p>
                            Resolution:
                            <span
                              class="font-medium px-1.5 py-0.5 rounded {getResolutionBadgeClass(entry.details.resolution as string)}">
                              {entry.details.resolution}
                            </span>
                          </p>
                        {/if}
                        {#if entry.details.previousResolution && entry.details.newResolution}
                          <p>
                            Changed from
                            <span class="font-medium">{entry.details.previousResolution}</span>
                            to
                            <span class="font-medium">{entry.details.newResolution}</span>
                          </p>
                        {/if}
                        {#if entry.details.reason}
                          <p>Reason: {entry.details.reason}</p>
                        {/if}
                        {#if entry.details.commentPreview}
                          <p class="italic truncate">"{entry.details.commentPreview}"</p>
                        {/if}
                        {#if entry.details.commentUnhidden}
                          <p class="text-green-600 dark:text-green-400">Comment was restored</p>
                        {/if}
                      </div>
                    {/if}

                    <div class="mt-1 text-xs text-gray-400">
                      {entry.target_type === 'report' ? 'Report' : 'Comment'} #{entry.target_id}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>

          <!-- Pagination -->
          {#if totalActivityPages > 1}
            <div class="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="ghost"
                size="small"
                onclick={() => goToActivityPage(activityPage - 1)}
                disabled={!hasPrevActivityPage}
              >
                <Icon name="chevron_left" />
                Previous
              </Button>

              <div class="flex items-center gap-1">
                {#each Array.from({ length: Math.min(5, totalActivityPages) }, (_, i) => {
                  let start = Math.max(1, activityPage - 2);
                  let end = Math.min(totalActivityPages, start + 4);
                  start = Math.max(1, end - 4);
                  return start + i;
                }).filter(p => p <= totalActivityPages) as pageNum (pageNum)}
                  <button
                    class="px-3 py-1 text-sm rounded {pageNum === activityPage
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}"
                    onclick={() => goToActivityPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                {/each}
              </div>

              <Button
                variant="ghost"
                size="small"
                onclick={() => goToActivityPage(activityPage + 1)}
                disabled={!hasNextActivityPage}
              >
                Next
                <Icon name="chevron_right" />
              </Button>
            </div>
          {/if}
        {/if}
      </div>
    {/snippet}
  </Tabs>
</article>

<!-- Resolution Modal -->
<Dialog
  bind:open={showResolveModal}
  onClose={closeResolveModal}
  title="Resolve Report"
  description="Choose how to handle this report."
>
  {#if selectedReport?.comment}
    <div class="-mt-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
      <p class="text-gray-700 dark:text-gray-300">
        "{selectedReport.comment.content.slice(0, 150)}{selectedReport.comment.content.length > 150 ? '...' : ''}"
      </p>
    </div>
  {/if}

  <div class="space-y-3">
    <Button
      variant="ghost"
      class="w-full justify-start"
      onclick={() => resolveReport('dismissed')}
      disabled={resolving}
    >
      <Icon name="close" class="mr-2 text-gray-500" />
      <div class="text-left">
        <div class="font-medium">Dismiss Report</div>
        <div class="text-xs text-gray-500">The report is unfounded, take no action.</div>
      </div>
    </Button>

    <Button
      variant="ghost"
      class="w-full justify-start"
      onclick={() => resolveReport('hidden')}
      disabled={resolving}
    >
      <Icon name="visibility_off" class="mr-2 text-yellow-600" />
      <div class="text-left">
        <div class="font-medium">Hide Comment</div>
        <div class="text-xs text-gray-500">Hide the comment from users, but keep it in the database.</div>
      </div>
    </Button>

    <Button
      variant="ghost"
      class="w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
      onclick={() => resolveReport('deleted')}
      disabled={resolving}
    >
      <Icon name="delete" class="mr-2" />
      <div class="text-left">
        <div class="font-medium">Delete Comment</div>
        <div class="text-xs text-gray-500">Permanently delete the comment and all its replies.</div>
      </div>
    </Button>
  </div>

  {#snippet footer()}
    <div class="flex justify-end">
      <Button variant="ghost" onclick={closeResolveModal} disabled={resolving}>
        Cancel
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Reopen Report Modal -->
<Dialog
  bind:open={showReopenModal}
  onClose={closeReopenModal}
  title="Reopen Report"
  description="This will mark the report as pending and require a new review."
>
  {#if selectedReportToReopen}
    <div class="-mt-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-medium text-gray-500">Current resolution:</span>
        <span
          class="px-2 py-0.5 rounded text-xs font-medium {getResolutionBadgeClass(selectedReportToReopen.resolution)}">
          {selectedReportToReopen.resolution}
        </span>
      </div>
      {#if selectedReportToReopen.comment}
        <p class="text-sm text-gray-700 dark:text-gray-300">
          "{selectedReportToReopen.comment.content.slice(0, 100)}{selectedReportToReopen.comment.content.length > 100 ? '...' : ''}"
        </p>
      {/if}
    </div>

    {#if selectedReportToReopen.resolution === 'hidden'}
      <div class="mb-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={reopenUnhideComment}
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">
            Also restore the hidden comment
          </span>
        </label>
        <p class="mt-1 ml-6 text-xs text-gray-500">
          If checked, the comment will be visible to users again.
        </p>
      </div>
    {/if}
  {/if}

  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={closeReopenModal} disabled={reopening}>
        Cancel
      </Button>
      <Button onclick={handleReopenReport} disabled={reopening}>
        {#if reopening}
          Reopening...
        {:else}
          Reopen Report
        {/if}
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Change Resolution Modal -->
<Dialog
  bind:open={showChangeResolutionModal}
  onClose={closeChangeResolutionModal}
  title="Change Resolution"
  description="Change how this report was resolved."
>
  {#if selectedReportToChange}
    <div class="-mt-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-medium text-gray-500">Current resolution:</span>
        <span
          class="px-2 py-0.5 rounded text-xs font-medium {getResolutionBadgeClass(selectedReportToChange.resolution)}">
          {selectedReportToChange.resolution}
        </span>
      </div>
      {#if selectedReportToChange.comment}
        <p class="text-sm text-gray-700 dark:text-gray-300">
          "{selectedReportToChange.comment.content.slice(0, 100)}{selectedReportToChange.comment.content.length > 100 ? '...' : ''}"
        </p>
      {/if}
    </div>

    <div class="space-y-3">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">New resolution:</p>

      <label
        class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors {newResolution === 'dismissed' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}">
        <input
          type="radio"
          name="newResolution"
          value="dismissed"
          bind:group={newResolution}
          class="mt-0.5"
          disabled={selectedReportToChange.resolution === 'dismissed'}
        />
        <span>
          <span
            class="font-medium text-sm {selectedReportToChange.resolution === 'dismissed' ? 'text-gray-400' : ''}">
            Dismiss
            {#if selectedReportToChange.resolution === 'dismissed'}
              <span class="text-xs text-gray-400">(current)</span>
            {/if}
          </span>
          <span class="text-xs text-gray-500">The report is unfounded, take no action on the comment.</span>
        </span>
      </label>

      <label
        class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors {newResolution === 'hidden' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}">
        <input
          type="radio"
          name="newResolution"
          value="hidden"
          bind:group={newResolution}
          class="mt-0.5"
          disabled={selectedReportToChange.resolution === 'hidden'}
        />
        <span>
          <span class="font-medium text-sm {selectedReportToChange.resolution === 'hidden' ? 'text-gray-400' : ''}">
            Hide
            {#if selectedReportToChange.resolution === 'hidden'}
              <span class="text-xs text-gray-400">(current)</span>
            {/if}
          </span>
          <span class="text-xs text-gray-500">Hide the comment from users, but keep it in the database.</span>
        </span>
      </label>

      <label
        class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors {newResolution === 'deleted' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}">
        <input
          type="radio"
          name="newResolution"
          value="deleted"
          bind:group={newResolution}
          class="mt-0.5"
          disabled={selectedReportToChange.resolution === 'deleted'}
        />
        <div>
          <div
            class="font-medium text-sm {selectedReportToChange.resolution === 'deleted' ? 'text-gray-400' : ''} {newResolution === 'deleted' ? 'text-red-600' : ''}">
            Delete
            {#if selectedReportToChange.resolution === 'deleted'}
              <span class="text-xs text-gray-400">(current)</span>
            {/if}
          </div>
          <div class="text-xs text-gray-500">Permanently delete the comment and all its replies.</div>
        </div>
      </label>
    </div>

    {#if newResolution === 'deleted' && selectedReportToChange.resolution !== 'deleted'}
      <div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p class="text-sm text-red-700 dark:text-red-300">
          <Icon name="warning" class="inline mr-1" />
          This will permanently delete the comment. This action cannot be undone.
        </p>
      </div>
    {/if}
  {/if}

  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={closeChangeResolutionModal} disabled={changingResolution}>
        Cancel
      </Button>
      <Button
        onclick={handleChangeResolution}
        disabled={changingResolution || newResolution === selectedReportToChange?.resolution}
        class={newResolution === 'deleted' ? 'bg-red-600 hover:bg-red-700' : ''}
      >
        {#if changingResolution}
          Changing...
        {:else}
          Change to {newResolution}
        {/if}
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Bulk Action Confirmation Modal -->
<Dialog
  bind:open={showBulkConfirmModal}
  onClose={closeBulkConfirmModal}
>
  {#snippet title()}
    {#if bulkResolution === 'dismissed'}
      Dismiss {selectedReportIds.size} Report{selectedReportIds.size !== 1 ? 's' : ''}
    {:else if bulkResolution === 'hidden'}
      Hide {selectedReportIds.size} Comment{selectedReportIds.size !== 1 ? 's' : ''}
    {:else}
      Delete {selectedReportIds.size} Comment{selectedReportIds.size !== 1 ? 's' : ''}
    {/if}
  {/snippet}

  {#snippet description()}
    {#if bulkResolution === 'dismissed'}
      This will mark {selectedReportIds.size} report{selectedReportIds.size !== 1 ? 's' : ''} as dismissed. No
      action will be taken on the reported comments.
    {:else if bulkResolution === 'hidden'}
      This will hide {selectedReportIds.size} reported comment{selectedReportIds.size !== 1 ? 's' : ''}. The
      comments will no longer be visible to users but can be restored later.
    {:else}
      This will permanently delete {selectedReportIds.size} reported
      comment{selectedReportIds.size !== 1 ? 's' : ''} and all their replies. This action cannot be undone.
    {/if}
  {/snippet}

  {#if bulkResolution === 'deleted'}
    <div class="-mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <p class="text-sm text-red-700 dark:text-red-300">
        <Icon name="warning" class="inline mr-1" />
        This is a destructive action. All selected comments and their replies will be permanently removed.
      </p>
    </div>
  {/if}

  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={closeBulkConfirmModal} disabled={bulkResolving}>
        Cancel
      </Button>
      <Button
        onclick={handleBulkResolve}
        disabled={bulkResolving}
        class={bulkResolution === 'deleted' ? 'bg-red-600 hover:bg-red-700' : ''}
      >
        {#if bulkResolving}
          <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          Processing...
        {:else if bulkResolution === 'dismissed'}
          Dismiss All
        {:else if bulkResolution === 'hidden'}
          Hide All Comments
        {:else}
          Delete All Comments
        {/if}
      </Button>
    </div>
  {/snippet}
</Dialog>
