<template>
  <section class="max-w-2xl space-y-4">
    <h2 class="text-xl font-semibold text-slate-900">Settings</h2>

    <form class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <label class="block space-y-2">
        <span class="text-sm font-medium text-slate-700">Workspace Name</span>
        <a-input type="text" value="Northwind Console" class="w-full" />
      </label>

      <label class="block space-y-2">
        <span class="text-sm font-medium text-slate-700">Notification Email</span>
        <a-input type="email" value="ops@northwind.dev" class="w-full" />
      </label>

      <a-button html-type="button" class="bg-brand-600 text-sm font-medium text-white hover:bg-brand-700">
        Save Changes
      </a-button>
    </form>
  </section>
</template>
