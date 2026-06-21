import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CoursesSection from '../components/Courses';
import CoursePageContent, {
  CourseComingSoon,
  defaultCourseVisibility,
  shouldShowCourseComingSoon,
} from '../components/CoursePageContent';
import { fetchPublicSettings } from '../lib/api';

const Courses = () => {
  const [visibility, setVisibility] = useState(defaultCourseVisibility);

  useEffect(() => {
    let mounted = true;
    fetchPublicSettings()
      .then((settings) => {
        if (mounted) {
          setVisibility({
            ...defaultCourseVisibility,
            ...(settings?.course_visibility || {}),
          });
        }
      })
      .catch(() => {
        if (mounted) setVisibility(defaultCourseVisibility);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="page bg-[#070314] text-white">
      <Header />
      {shouldShowCourseComingSoon(visibility) ? (
        <CourseComingSoon visibility={visibility} />
      ) : (
        <CoursePageContent>
          <CoursesSection />
        </CoursePageContent>
      )}
      <Footer />
    </main>
  );
};

export default Courses;
