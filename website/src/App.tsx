import Nav from './components/Nav'
import Hero from './components/Hero'
import TrustBar from './components/TrustBar'
import AppLogoStrip from './components/AppLogoStrip'
import UseCases from './components/UseCases'
import HowItWorks from './components/HowItWorks'
import FeatureGrid from './components/FeatureGrid'
import VoxlitCloudPush from './components/VoxlitCloudPush'
import ComparisonTable from './components/ComparisonTable'
import SecuritySignals from './components/SecuritySignals'
import TechSpecs from './components/TechSpecs'
import Testimonials from './components/Testimonials'
import FAQ from './components/FAQ'
import DownloadCTA from './components/DownloadCTA'
import FromTheMaker from './components/FromTheMaker'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustBar />
        <AppLogoStrip />
        <UseCases />
        <FeatureGrid />
        <VoxlitCloudPush />
        <HowItWorks />
        <FromTheMaker />
        <ComparisonTable />
        <SecuritySignals />
        <TechSpecs />
        <Testimonials />
        <FAQ />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  )
}
