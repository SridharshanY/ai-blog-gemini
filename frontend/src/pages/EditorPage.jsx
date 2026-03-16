import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuillEditor from '../components/QuillEditor';
import api from '../api/client';

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Load draft if editing
  useEffect(() => {
    if (!id) return;
    setLoadingDraft(true);
    (async () => {
      try {
        const res = await api.get(`/drafts/${id}`);
        const d = res.data.draft;
        setTitle(d.title || '');
        setBodyHtml(d.body || '');
        setTopic(d.topic || '');
        setKeywords((d.keywords || []).join(', '));
      } catch (err) {
        console.error('Failed to load draft', err);
      } finally {
        setLoadingDraft(false);
      }
    })();
  }, [id]);

  // Generate AI content
  async function onGenerate() {
    if (!topic) {
      alert('Please enter a topic to generate content');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        topic,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        tone: 'conversational',
        length: 'medium',
        model: 'gemini-2.5-flash',
      };
      const res = await api.post('/generate', payload);

      let rawHtml = res?.data?.draft?.body || '';
      // Remove ```html fences if present
      const cleanHtml = rawHtml.replace(/```html\s*|```/g, '').trim();

      setBodyHtml(cleanHtml);
      setTitle(res?.data?.draft?.title || '');

      // Navigate if new draft
      if (res.data.draft?._id && !id) {
        navigate(`/editor/${res.data.draft._id}`, { replace: true });
      }
    } catch (e) {
      console.error(e);
      alert('Generation failed: ' + (e?.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  }

  // Save draft
  async function onSave() {
    if (!title.trim()) {
      alert('Please add a title before saving');
      return;
    }
    try {
      const payload = {
        id,
        title,
        body: bodyHtml,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        topic,
      };
      const res = await api.post('/drafts', payload);
      alert('Draft saved successfully!');

      // Navigate to new draft if id was not present
      if (!id && res?.data?.draft?._id) {
        navigate(`/editor/${res.data.draft._id}`, { replace: true });
      }
    } catch (e) {
      console.error(e);
      alert('Save failed. Please try again.');
    }
  }

  if (loadingDraft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your draft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {id ? 'Edit Draft' : 'Create New Blog Post'}
              </h1>
              <p className="text-gray-600 mt-2">
                {id ? 'Continue editing your draft' : 'Start with AI generation or write from scratch'}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Auto-save disabled</span>
            </div>
          </div>

          {/* Generation Controls */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Topic *</span>
                  </div>
                </label>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="What do you want to write about?"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Keywords</span>
                  </div>
                </label>
                <input
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="ai, blogging, content, marketing"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="lg:col-span-4">
                <button
                  onClick={onGenerate}
                  disabled={loading || !topic.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating with AI...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Generate with Gemini AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Blog Title</span>
              </div>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter a compelling title for your blog post..."
              className="w-full p-4 text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Content Editor</span>
            </h3>
          </div>
          <div className="p-1">
            <QuillEditor initialHtml={bodyHtml} onChange={setBodyHtml} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <button
            onClick={() => navigate('/drafts')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium py-3 px-6 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Drafts</span>
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to discard changes?')) {
                  navigate('/drafts');
                }
              }}
              className="px-6 py-3 border-2 border-red-300 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-all duration-200"
            >
              Discard
            </button>
            
            <button
              onClick={onSave}
              disabled={!title.trim()}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Draft</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}