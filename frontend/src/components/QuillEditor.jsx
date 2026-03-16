import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';


export default function QuillEditor({ initialHtml = '', onChange = () => {}, placeholder = 'Write your blog here...' }) {
  const [value, setValue] = useState(initialHtml);

  useEffect(() => {
    setValue(initialHtml || ''); // hydrate editor
  }, [initialHtml]);

  const handleChange = (content) => {
    const cleanHtml = DOMPurify.sanitize(content);
    setValue(cleanHtml);
    onChange(cleanHtml);
  };

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean']
  ]
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'blockquote',
  'list', 'bullet',
  'link', 'image'
];

  return (
    <div className="border rounded shadow-sm bg-white">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="min-h-[300px]"
      />
    </div>
  );
}
