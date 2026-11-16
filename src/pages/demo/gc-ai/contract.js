// The sample contract: a short, vendor-favourable SaaS subscription agreement, written for this
// demo. Fictional parties. Curly quotes, apostrophes and the parenthetical numbers are kept on
// purpose: they are what a model tends to "normalise" when it quotes text back, which is exactly
// what the anchoring step has to cope with. Shared by the page, the API route and the .docx export.

export const CONTRACT = {
  id: 'msa-quillstone',
  file: 'Quillstone – Northgate MSA (vendor draft).docx',
  title: 'Master Subscription Agreement',
  parties:
    'This Master Subscription Agreement (the “Agreement”) is entered into as of November 2, 2026 (the “Effective Date”) between Quillstone Software, Inc., a Delaware corporation (“Provider”), and Northgate Provisions, LLC, an Ontario limited liability company (“Customer”).',
  counterparty: 'Quillstone Software, Inc.',
  clauses: [
    {
      n: 1,
      heading: 'Definitions',
      text: '“Affiliate” means any entity that controls, is controlled by, or is under common control with a party. “Customer Data” means all data, files and information that Customer or its Users submit to the Services. “Order Form” means an ordering document signed by both parties that references this Agreement. “Services” means Provider’s hosted procurement analytics platform described in an Order Form. “Users” means Customer’s employees and contractors authorized to use the Services.',
    },
    {
      n: 2,
      heading: 'Access and Use',
      text: 'Subject to this Agreement and payment of all Fees, Provider grants Customer a non-exclusive, non-transferable right during the Subscription Term to access and use the Services for its internal business purposes. Customer shall not (a) resell or sublicense the Services, (b) reverse engineer the Services, or (c) use the Services to build a competing product. Provider may modify the Services at any time, including by removing features, upon notice to Customer.',
    },
    {
      n: 3,
      heading: 'Fees and Payment',
      text: 'Customer shall pay all fees set out in each Order Form (“Fees”) annually in advance, within fifteen (15) days of the invoice date. Late payments accrue interest at one and one-half percent (1.5%) per month. Provider may increase the Fees for any Renewal Term at its sole discretion by giving notice before the end of the then-current term. Fees are non-cancellable and non-refundable except as expressly stated in this Agreement.',
    },
    {
      n: 4,
      heading: 'Term and Renewal',
      text: 'This Agreement begins on the Effective Date and continues until all Order Forms have expired. Each Order Form has an initial subscription term of thirty-six (36) months (the “Subscription Term”) and then renews automatically for successive thirty-six (36) month periods (each, a “Renewal Term”) unless either party gives written notice of non-renewal at least ninety (90) days before the end of the then-current term.',
    },
    {
      n: 5,
      heading: 'Termination',
      text: 'Either party may terminate this Agreement if the other party materially breaches it and fails to cure the breach within thirty (30) days after written notice. Customer may not terminate this Agreement or any Order Form for convenience. On any termination, all unpaid Fees for the remainder of the Subscription Term become immediately due and payable.',
    },
    {
      n: 6,
      heading: 'Confidentiality',
      text: 'Customer shall hold in confidence all non-public information disclosed by Provider that is marked or reasonably understood to be confidential (“Confidential Information”), use it only to perform under this Agreement, and protect it with at least reasonable care. These obligations continue for two (2) years after this Agreement ends.',
    },
    {
      n: 7,
      heading: 'Customer Data',
      text: 'As between the parties, Customer retains ownership of Customer Data. Customer grants Provider a perpetual, irrevocable, worldwide license to use, copy and modify Customer Data to provide and improve the Services and for any other lawful business purpose. Within one hundred eighty (180) days after termination, Provider will delete Customer Data upon Customer’s written request.',
    },
    {
      n: 8,
      heading: 'Security and Breach Notice',
      text: 'Provider will use commercially reasonable efforts to protect Customer Data from unauthorized access. Provider will notify Customer of any confirmed breach of the Services that affects Customer Data without undue delay after Provider determines that notice is legally required.',
    },
    {
      n: 9,
      heading: 'Warranties and Disclaimer',
      text: 'Provider warrants that the Services will perform materially in accordance with the documentation. Customer’s sole remedy for breach of this warranty is for Provider to use reasonable efforts to correct the non-conformity. Except as stated in this Section 9, the Services are provided “as is” and Provider disclaims all other warranties, express or implied.',
    },
    {
      n: 10,
      heading: 'Indemnification',
      text: 'Customer shall defend, indemnify and hold harmless Provider and its Affiliates from any third-party claim arising from Customer Data or Customer’s use of the Services. Provider has no obligation to defend Customer against claims that the Services infringe a third party’s intellectual property rights.',
    },
    {
      n: 11,
      heading: 'Limitation of Liability',
      text: 'In no event will Provider be liable for any indirect, incidental, special or consequential damages, or for lost profits or lost data. Provider’s total liability under this Agreement will not exceed the Fees paid by Customer in the three (3) months before the event giving rise to the claim. Customer’s liability under this Agreement is not limited.',
    },
    {
      n: 12,
      heading: 'Governing Law and Venue',
      text: 'This Agreement is governed by the laws of the State of California, without regard to its conflict of laws rules. Each party submits to the exclusive jurisdiction of the state and federal courts located in Santa Clara County, California.',
    },
    {
      n: 13,
      heading: 'General',
      text: 'Provider may assign this Agreement without Customer’s consent; Customer may not assign it without Provider’s prior written consent. Provider may identify Customer as a customer in its marketing materials. This Agreement, with each Order Form, is the parties’ entire agreement on its subject matter and supersedes all prior agreements.',
    },
  ],
};

export const clauseByNumber = n => CONTRACT.clauses.find(clause => clause.n === Number(n));

/** Plain-text contract for the model: one numbered clause per paragraph. */
export function contractForPrompt(contract = CONTRACT) {
  return contract.clauses
    .map(clause => `§${clause.n} ${clause.heading}\n${clause.text}`)
    .join('\n\n');
}
