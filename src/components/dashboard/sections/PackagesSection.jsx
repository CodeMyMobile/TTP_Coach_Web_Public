import React from 'react';
import { Package, RefreshCw } from 'lucide-react';

const PackagesSection = ({
  packages,
  packagesLoading,
  packagesError,
  onRefreshPackages,
  onOpenCreatePackage,
  currencyFormatter,
  formatLessonTypeLabel,
  formatValidityLabel
}) => (
  <section className="mt-6 space-y-6">
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Lesson Packages</h2>
          <p className="text-sm text-gray-500">
            Create and manage lesson bundles for your students
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreatePackage}
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 sm:w-auto sm:justify-start"
        >
          <Package className="h-4 w-4" />
          <span>Create package</span>
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {packagesLoading && packages.length === 0 && (
          <div className="flex flex-col items-center justify-center space-y-2 py-10">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
            <p className="text-sm text-gray-500">Loading packages...</p>
          </div>
        )}

        {!packagesLoading && packagesError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">We couldn't load your packages.</p>
            <p className="mt-1 text-xs text-red-600">{packagesError}</p>
            <button
              type="button"
              onClick={onRefreshPackages}
              className="mt-3 inline-flex items-center space-x-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {!packagesLoading && !packagesError && packages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
            <h3 className="text-base font-semibold text-gray-900">No packages yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Create your first lesson bundle to offer students multi-lesson savings.
            </p>
            <button
              type="button"
              onClick={onOpenCreatePackage}
              className="mt-4 inline-flex items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
            >
              <Package className="h-4 w-4" />
              <span>Create package</span>
            </button>
          </div>
        ) : null}

        {packages.length > 0 &&
          packages.map((lessonPackage) => (
            <div
              key={lessonPackage.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {lessonPackage.name}
                    </h3>
                    {!lessonPackage.isActive && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        Archived
                      </span>
                    )}
                  </div>
                  {lessonPackage.description && (
                    <p className="mt-1 text-sm text-gray-500">
                      {lessonPackage.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {lessonPackage.lessonTypes.length > 0 ? (
                    lessonPackage.lessonTypes.map((type) => (
                      <span
                        key={`${lessonPackage.id}-${type}`}
                        className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700"
                      >
                        {formatLessonTypeLabel(type)}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      Any lesson type
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Price</p>
                  <p className="text-sm font-medium text-gray-900">
                    {lessonPackage.totalPrice !== null
                      ? currencyFormatter.format(lessonPackage.totalPrice)
                      : 'N/A'}
                  </p>
                  {lessonPackage.perLessonPrice !== null && (
                    <p className="text-xs text-gray-500">
                      {currencyFormatter.format(lessonPackage.perLessonPrice)} per lesson
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Lessons Included</p>
                  <p className="text-sm font-medium text-gray-900">
                    {lessonPackage.lessonCount !== null
                      ? `${lessonPackage.lessonCount} lessons`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Validity</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatValidityLabel(lessonPackage.validityMonths)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Status</p>
                  <p
                    className={`text-sm font-medium ${
                      lessonPackage.isActive ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {lessonPackage.isActive ? 'Active' : 'Archived'}
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  </section>
);

export default PackagesSection;
