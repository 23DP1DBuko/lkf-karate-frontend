import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import api from '../../api/strapi'

const categoryLabels = {
  kata: 'Kata',
  kumite: 'Kumite',
  secretary: 'Secretary',
  seminar: 'Seminar',
}

const categoryColors = {
  kata: 'bg-blue-100 text-blue-700',
  kumite: 'bg-red-100 text-red-700',
  secretary: 'bg-green-100 text-green-700',
  seminar: 'bg-purple-100 text-purple-700',
}

export default function Courses() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get('/courses?filters[published][$eq]=true&sort=title:asc').then(r => r.data.data)
  })

  const filtered = data?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'all' || course.category === category
    return matchesSearch && matchesCategory
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-gray-500">Loading courses...</p>
    </div>
  )

  if (isError) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-red-500">Failed to load courses.</p>
    </div>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-700 mb-2">Courses</h1>
      <p className="text-gray-500 mb-6">Select a course to start learning</p>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Categories</option>
          <option value="kata">Kata</option>
          <option value="kumite">Kumite</option>
          <option value="secretary">Secretary</option>
          <option value="seminar">Seminar</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-400 mb-4">
        Showing {filtered?.length || 0} of {data?.length || 0} courses
      </p>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered?.map(course => (
          <Link
            key={course.id}
            to={`/courses/${course.documentId}`}
            className="bg-white rounded-xl shadow hover:shadow-md transition p-6 block"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-xl font-semibold">{course.title}</h2>
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ml-2 ${categoryColors[course.category]}`}>
                {categoryLabels[course.category]}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{course.description}</p>
          </Link>
        ))}
      </div>

      {filtered?.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-400">No courses match your search.</p>
          <button
            onClick={() => { setSearch(''); setCategory('all') }}
            className="mt-4 text-blue-600 hover:underline text-sm"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}