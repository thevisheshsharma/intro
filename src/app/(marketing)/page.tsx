import Hero from '@/components/marketing/Hero'
import FeaturesScrollSection from '@/components/marketing/FeaturesScrollSection'
import VisualSection from '@/components/marketing/VisualSection'
import Testimonials from '@/components/marketing/Testimonials'
import CTA from '@/components/marketing/CTA'

export default function Home() {
    return (
        <>
            <Hero />
            <FeaturesScrollSection />
            <VisualSection />
            <Testimonials />
            <CTA />
        </>
    )
}
