// src/app/wordpress-data/page.tsx
'use client'; // لأننا سنستخدم useState و useEffect لجلب البيانات في متصفح المستخدم

import React, { useState, useEffect } from 'react';

const WordPressDataPage: React.FC = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ******** هذا هو رابط API الخاص بـ WordPress لجلب المنشورات العادية ********
  const WORDPRESS_API_URL = 'https://csm.sanadedu.org/wp-json/wp/v2/posts';
  // **************************************************************************

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await fetch(WORDPRESS_API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setItems(data);
        setError(null);
      } catch (e: any) {
        console.error("Error fetching items from WordPress:", e);
        setError(e.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>
      <h1>بيانات من ووردبريس (صفحة تجريبية)</h1>
      <p>هذه الصفحة تعرض بيانات مجلوبة من موقع ووردبريس الخاص بك.</p>

      <h2>البيانات المجلوبة:</h2>
      {loading && <p>جاري تحميل البيانات...</p>}
      {error && <p style={{ color: 'red' }}>حدث خطأ: {error}</p>}
      {!loading && !error && items.length === 0 && <p>لا توجد بيانات لعرضها.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '30px' }}>
        {items.map((item: any) => (
          <div key={item.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', textAlign: 'right', backgroundColor: '#f9f9f9' }}>
            <h3 style={{ color: 'var(--primary-green)', marginBottom: '10px' }}>{item.title.rendered}</h3>
            <div dangerouslySetInnerHTML={{ __html: item.excerpt.rendered }} style={{ fontSize: '0.9em', color: 'var(--text-dark)' }} />
            <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '15px', color: 'var(--secondary-color)', textDecoration: 'none', fontWeight: 'bold' }}>
              عرض المصدر
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordPressDataPage;