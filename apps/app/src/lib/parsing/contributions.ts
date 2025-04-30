//region Relator type
/**
 * Relator terms and their associated codes designate the relationship
 * between an agent and a bibliographic resource.
 *
 * @see https://id.loc.gov/vocabulary/relators
 */
export type Relator =
  /**
   * Former owner
   *
   * @see http://id.loc.gov/vocabulary/relators/fmo
   */
  | "fmo"

  /**
   * Audio engineer
   *
   * @see http://id.loc.gov/vocabulary/relators/aue
   */
  | "aue"

  /**
   * Speaker
   *
   * @see http://id.loc.gov/vocabulary/relators/spk
   */
  | "spk"

  /**
   * Designer
   *
   * @see http://id.loc.gov/vocabulary/relators/dsr
   */
  | "dsr"

  /**
   * Bookplate designer
   *
   * @see http://id.loc.gov/vocabulary/relators/bpd
   */
  | "bpd"

  /**
   * Production company
   *
   * @see http://id.loc.gov/vocabulary/relators/prn
   */
  | "prn"

  /**
   * Dissertant
   *
   * @see http://id.loc.gov/vocabulary/relators/dis
   */
  | "dis"

  /**
   * Musician
   *
   * @see http://id.loc.gov/vocabulary/relators/mus
   */
  | "mus"

  /**
   * Collection registrar
   *
   * @see http://id.loc.gov/vocabulary/relators/cor
   */
  | "cor"

  /**
   * Book artist
   *
   * @see http://id.loc.gov/vocabulary/relators/bka
   */
  | "bka"

  /**
   * Respondent-appellee
   *
   * @see http://id.loc.gov/vocabulary/relators/rse
   */
  | "rse"

  /**
   * Plaintiff
   *
   * @see http://id.loc.gov/vocabulary/relators/ptf
   */
  | "ptf"

  /**
   * Engraver
   *
   * @see http://id.loc.gov/vocabulary/relators/egr
   */
  | "egr"

  /**
   * Geographic information specialist
   *
   * @see http://id.loc.gov/vocabulary/relators/gis
   */
  | "gis"

  /**
   * Printer
   *
   * @see http://id.loc.gov/vocabulary/relators/prt
   */
  | "prt"

  /**
   * Conceptor
   *
   * @see http://id.loc.gov/vocabulary/relators/ccp
   */
  | "ccp"

  /**
   * Applicant
   *
   * @see http://id.loc.gov/vocabulary/relators/app
   */
  | "app"

  /**
   * Copyright claimant
   *
   * @see http://id.loc.gov/vocabulary/relators/cpc
   */
  | "cpc"

  /**
   * Libelant
   *
   * @see http://id.loc.gov/vocabulary/relators/lil
   */
  | "lil"

  /**
   * Appellee
   *
   * @see http://id.loc.gov/vocabulary/relators/ape
   */
  | "ape"

  /**
   * Honoree
   *
   * @see http://id.loc.gov/vocabulary/relators/hnr
   */
  | "hnr"

  /**
   * Complainant-appellant
   *
   * @see http://id.loc.gov/vocabulary/relators/cpt
   */
  | "cpt"

  /**
   * Organizer
   *
   * @see http://id.loc.gov/vocabulary/relators/orm
   */
  | "orm"

  /**
   * Braille embosser
   *
   * @see http://id.loc.gov/vocabulary/relators/brl
   */
  | "brl"

  /**
   * Adapter
   *
   * @see http://id.loc.gov/vocabulary/relators/adp
   */
  | "adp"

  /**
   * Writer of introduction
   *
   * @see http://id.loc.gov/vocabulary/relators/win
   */
  | "win"

  /**
   * Lithographer
   *
   * @see http://id.loc.gov/vocabulary/relators/ltg
   */
  | "ltg"

  /**
   * Funder
   *
   * @see http://id.loc.gov/vocabulary/relators/fnd
   */
  | "fnd"

  /**
   * Corrector
   *
   * @see http://id.loc.gov/vocabulary/relators/crr
   */
  | "crr"

  /**
   * Voice actor
   *
   * @see http://id.loc.gov/vocabulary/relators/vac
   */
  | "vac"

  /**
   * Wood engraver
   *
   * @see http://id.loc.gov/vocabulary/relators/wde
   */
  | "wde"

  /**
   * Animator
   *
   * @see http://id.loc.gov/vocabulary/relators/anm
   */
  | "anm"

  /**
   * Monitor
   *
   * @see http://id.loc.gov/vocabulary/relators/mon
   */
  | "mon"

  /**
   * Electrotyper
   *
   * @see http://id.loc.gov/vocabulary/relators/elt
   */
  | "elt"

  /**
   * Associated name
   *
   * @see http://id.loc.gov/vocabulary/relators/asn
   */
  | "asn"

  /**
   * Television producer
   *
   * @see http://id.loc.gov/vocabulary/relators/tlp
   */
  | "tlp"

  /**
   * Originator
   *
   * @see http://id.loc.gov/vocabulary/relators/org
   */
  | "org"

  /**
   * Stage director
   *
   * @see http://id.loc.gov/vocabulary/relators/sgd
   */
  | "sgd"

  /**
   * Compiler
   *
   * @see http://id.loc.gov/vocabulary/relators/com
   */
  | "com"

  /**
   * Inscriber
   *
   * @see http://id.loc.gov/vocabulary/relators/ins
   */
  | "ins"

  /**
   * Creator
   *
   * @see http://id.loc.gov/vocabulary/relators/cre
   */
  | "cre"

  /**
   * Manufacturer
   *
   * @see http://id.loc.gov/vocabulary/relators/mfr
   */
  | "mfr"

  /**
   * Moderator
   *
   * @see http://id.loc.gov/vocabulary/relators/mod
   */
  | "mod"

  /**
   * Composer
   *
   * @see http://id.loc.gov/vocabulary/relators/cmp
   */
  | "cmp"

  /**
   * Data contributor
   *
   * @see http://id.loc.gov/vocabulary/relators/dtc
   */
  | "dtc"

  /**
   * Process contact
   *
   * @see http://id.loc.gov/vocabulary/relators/prc
   */
  | "prc"

  /**
   * Scenarist
   *
   * @see http://id.loc.gov/vocabulary/relators/sce
   */
  | "sce"

  /**
   * Type designer
   *
   * @see http://id.loc.gov/vocabulary/relators/tyd
   */
  | "tyd"

  /**
   * Producer
   *
   * @see http://id.loc.gov/vocabulary/relators/pro
   */
  | "pro"

  /**
   * Client
   *
   * @see http://id.loc.gov/vocabulary/relators/cli
   */
  | "cli"

  /**
   * Contestant
   *
   * @see http://id.loc.gov/vocabulary/relators/cos
   */
  | "cos"

  /**
   * Delineator
   *
   * @see http://id.loc.gov/vocabulary/relators/dln
   */
  | "dln"

  /**
   * Film director
   *
   * @see http://id.loc.gov/vocabulary/relators/fmd
   */
  | "fmd"

  /**
   * Translator
   *
   * @see http://id.loc.gov/vocabulary/relators/trl
   */
  | "trl"

  /**
   * Production manager
   *
   * @see http://id.loc.gov/vocabulary/relators/pmn
   */
  | "pmn"

  /**
   * Publisher
   *
   * @see http://id.loc.gov/vocabulary/relators/pbl
   */
  | "pbl"

  /**
   * Annotator
   *
   * @see http://id.loc.gov/vocabulary/relators/ann
   */
  | "ann"

  /**
   * Minute taker
   *
   * @see http://id.loc.gov/vocabulary/relators/mtk
   */
  | "mtk"

  /**
   * Television writer
   *
   * @see http://id.loc.gov/vocabulary/relators/tau
   */
  | "tau"

  /**
   * Libelee
   *
   * @see http://id.loc.gov/vocabulary/relators/lel
   */
  | "lel"

  /**
   * Audio producer
   *
   * @see http://id.loc.gov/vocabulary/relators/aup
   */
  | "aup"

  /**
   * Arranger
   *
   * @see http://id.loc.gov/vocabulary/relators/arr
   */
  | "arr"

  /**
   * Costume designer
   *
   * @see http://id.loc.gov/vocabulary/relators/cst
   */
  | "cst"

  /**
   * Enacting jurisdiction
   *
   * @see http://id.loc.gov/vocabulary/relators/enj
   */
  | "enj"

  /**
   * Metal engraver
   *
   * @see http://id.loc.gov/vocabulary/relators/mte
   */
  | "mte"

  /**
   * Television director
   *
   * @see http://id.loc.gov/vocabulary/relators/tld
   */
  | "tld"

  /**
   * Writer of added lyrics
   *
   * @see http://id.loc.gov/vocabulary/relators/wal
   */
  | "wal"

  /**
   * Copyright holder
   *
   * @see http://id.loc.gov/vocabulary/relators/cph
   */
  | "cph"

  /**
   * Choreographer
   *
   * @see http://id.loc.gov/vocabulary/relators/chr
   */
  | "chr"

  /**
   * Storyteller
   *
   * @see http://id.loc.gov/vocabulary/relators/stl
   */
  | "stl"

  /**
   * Metadata contact
   *
   * @see http://id.loc.gov/vocabulary/relators/mdc
   */
  | "mdc"

  /**
   * Reviewer
   *
   * @see http://id.loc.gov/vocabulary/relators/rev
   */
  | "rev"

  /**
   * Licensee
   *
   * @see http://id.loc.gov/vocabulary/relators/lse
   */
  | "lse"

  /**
   * Collotyper
   *
   * @see http://id.loc.gov/vocabulary/relators/clt
   */
  | "clt"

  /**
   * Interviewer
   *
   * @see http://id.loc.gov/vocabulary/relators/ivr
   */
  | "ivr"

  /**
   * Illustrator
   *
   * @see http://id.loc.gov/vocabulary/relators/ill
   */
  | "ill"

  /**
   * Architect
   *
   * @see http://id.loc.gov/vocabulary/relators/arc
   */
  | "arc"

  /**
   * Libelee-appellee
   *
   * @see http://id.loc.gov/vocabulary/relators/lee
   */
  | "lee"

  /**
   * Contestee
   *
   * @see http://id.loc.gov/vocabulary/relators/cts
   */
  | "cts"

  /**
   * Art director
   *
   * @see http://id.loc.gov/vocabulary/relators/adi
   */
  | "adi"

  /**
   * Electrician
   *
   * @see http://id.loc.gov/vocabulary/relators/elg
   */
  | "elg"

  /**
   * Bibliographic antecedent
   *
   * @see http://id.loc.gov/vocabulary/relators/ant
   */
  | "ant"

  /**
   * Onscreen presenter
   *
   * @see http://id.loc.gov/vocabulary/relators/osp
   */
  | "osp"

  /**
   * Addressee
   *
   * @see http://id.loc.gov/vocabulary/relators/rcp
   */
  | "rcp"

  /**
   * Announcer
   *
   * @see http://id.loc.gov/vocabulary/relators/anc
   */
  | "anc"

  /**
   * Publisher director
   *
   * @see http://id.loc.gov/vocabulary/relators/pbd
   */
  | "pbd"

  /**
   * Sound engineer
   *
   * @see http://id.loc.gov/vocabulary/relators/sde
   */
  | "sde"

  /**
   * Attributed name
   *
   * @see http://id.loc.gov/vocabulary/relators/att
   */
  | "att"

  /**
   * Stage manager
   *
   * @see http://id.loc.gov/vocabulary/relators/stm
   */
  | "stm"

  /**
   * Illuminator
   *
   * @see http://id.loc.gov/vocabulary/relators/ilu
   */
  | "ilu"

  /**
   * Draftsman
   *
   * @see http://id.loc.gov/vocabulary/relators/drm
   */
  | "drm"

  /**
   * Programmer
   *
   * @see http://id.loc.gov/vocabulary/relators/prg
   */
  | "prg"

  /**
   * Television host
   *
   * @see http://id.loc.gov/vocabulary/relators/tlh
   */
  | "tlh"

  /**
   * Laboratory director
   *
   * @see http://id.loc.gov/vocabulary/relators/ldr
   */
  | "ldr"

  /**
   * Singer
   *
   * @see http://id.loc.gov/vocabulary/relators/sng
   */
  | "sng"

  /**
   * Writer of accompanying material
   *
   * @see http://id.loc.gov/vocabulary/relators/wam
   */
  | "wam"

  /**
   * Seller
   *
   * @see http://id.loc.gov/vocabulary/relators/sll
   */
  | "sll"

  /**
   * Restorationist
   *
   * @see http://id.loc.gov/vocabulary/relators/rsr
   */
  | "rsr"

  /**
   * Dedicator
   *
   * @see http://id.loc.gov/vocabulary/relators/dto
   */
  | "dto"

  /**
   * Host
   *
   * @see http://id.loc.gov/vocabulary/relators/hst
   */
  | "hst"

  /**
   * Printmaker
   *
   * @see http://id.loc.gov/vocabulary/relators/prm
   */
  | "prm"

  /**
   * Restager
   *
   * @see http://id.loc.gov/vocabulary/relators/rsg
   */
  | "rsg"

  /**
   * Abridger
   *
   * @see http://id.loc.gov/vocabulary/relators/abr
   */
  | "abr"

  /**
   * Recordist
   *
   * @see http://id.loc.gov/vocabulary/relators/rcd
   */
  | "rcd"

  /**
   * Censor
   *
   * @see http://id.loc.gov/vocabulary/relators/cns
   */
  | "cns"

  /**
   * Contributor
   *
   * @see http://id.loc.gov/vocabulary/relators/ctb
   */
  | "ctb"

  /**
   * Research team head
   *
   * @see http://id.loc.gov/vocabulary/relators/rth
   */
  | "rth"

  /**
   * University place
   *
   * @see http://id.loc.gov/vocabulary/relators/uvp
   */
  | "uvp"

  /**
   * Surveyor
   *
   * @see http://id.loc.gov/vocabulary/relators/srv
   */
  | "srv"

  /**
   * Author of dialog
   *
   * @see http://id.loc.gov/vocabulary/relators/aud
   */
  | "aud"

  /**
   * Teacher
   *
   * @see http://id.loc.gov/vocabulary/relators/tch
   */
  | "tch"

  /**
   * Patron
   *
   * @see http://id.loc.gov/vocabulary/relators/pat
   */
  | "pat"

  /**
   * Writer of preface
   *
   * @see http://id.loc.gov/vocabulary/relators/wpr
   */
  | "wpr"

  /**
   * Production designer
   *
   * @see http://id.loc.gov/vocabulary/relators/prs
   */
  | "prs"

  /**
   * Artist
   *
   * @see http://id.loc.gov/vocabulary/relators/art
   */
  | "art"

  /**
   * Music copyist
   *
   * @see http://id.loc.gov/vocabulary/relators/mcp
   */
  | "mcp"

  /**
   * Panelist
   *
   * @see http://id.loc.gov/vocabulary/relators/pan
   */
  | "pan"

  /**
   * Setting
   *
   * @see http://id.loc.gov/vocabulary/relators/stg
   */
  | "stg"

  /**
   * Plaintiff-appellee
   *
   * @see http://id.loc.gov/vocabulary/relators/pte
   */
  | "pte"

  /**
   * Appellant
   *
   * @see http://id.loc.gov/vocabulary/relators/apl
   */
  | "apl"

  /**
   * Manufacture place
   *
   * @see http://id.loc.gov/vocabulary/relators/mfp
   */
  | "mfp"

  /**
   * Editor of moving image work
   *
   * @see http://id.loc.gov/vocabulary/relators/edm
   */
  | "edm"

  /**
   * Witness
   *
   * @see http://id.loc.gov/vocabulary/relators/wit
   */
  | "wit"

  /**
   * Actor
   *
   * @see http://id.loc.gov/vocabulary/relators/act
   */
  | "act"

  /**
   * Reporter
   *
   * @see http://id.loc.gov/vocabulary/relators/rpt
   */
  | "rpt"

  /**
   * Standards body
   *
   * @see http://id.loc.gov/vocabulary/relators/stn
   */
  | "stn"

  /**
   * Interviewee
   *
   * @see http://id.loc.gov/vocabulary/relators/ive
   */
  | "ive"

  /**
   * Visual effects provider
   *
   * @see http://id.loc.gov/vocabulary/relators/vfx
   */
  | "vfx"

  /**
   * Author of introduction, etc.
   *
   * @see http://id.loc.gov/vocabulary/relators/aui
   */
  | "aui"

  /**
   * Landscape architect
   *
   * @see http://id.loc.gov/vocabulary/relators/lsa
   */
  | "lsa"

  /**
   * Auctioneer
   *
   * @see http://id.loc.gov/vocabulary/relators/auc
   */
  | "auc"

  /**
   * Signer
   *
   * @see http://id.loc.gov/vocabulary/relators/sgn
   */
  | "sgn"

  /**
   * Contestee-appellant
   *
   * @see http://id.loc.gov/vocabulary/relators/ctt
   */
  | "ctt"

  /**
   * Project director
   *
   * @see http://id.loc.gov/vocabulary/relators/pdr
   */
  | "pdr"

  /**
   * Cinematographer
   *
   * @see http://id.loc.gov/vocabulary/relators/cng
   */
  | "cng"

  /**
   * Judge
   *
   * @see http://id.loc.gov/vocabulary/relators/jud
   */
  | "jud"

  /**
   * Lead
   *
   * @see http://id.loc.gov/vocabulary/relators/led
   */
  | "led"

  /**
   * Broadcaster
   *
   * @see http://id.loc.gov/vocabulary/relators/brd
   */
  | "brd"

  /**
   * Collector
   *
   * @see http://id.loc.gov/vocabulary/relators/col
   */
  | "col"

  /**
   * Defendant-appellee
   *
   * @see http://id.loc.gov/vocabulary/relators/dfe
   */
  | "dfe"

  /**
   * Owner
   *
   * @see http://id.loc.gov/vocabulary/relators/own
   */
  | "own"

  /**
   * Narrator
   *
   * @see http://id.loc.gov/vocabulary/relators/nrt
   */
  | "nrt"

  /**
   * Compositor
   *
   * @see http://id.loc.gov/vocabulary/relators/cmt
   */
  | "cmt"

  /**
   * Libelant-appellant
   *
   * @see http://id.loc.gov/vocabulary/relators/lit
   */
  | "lit"

  /**
   * Dancer
   *
   * @see http://id.loc.gov/vocabulary/relators/dnc
   */
  | "dnc"

  /**
   * Etcher
   *
   * @see http://id.loc.gov/vocabulary/relators/etr
   */
  | "etr"

  /**
   * Film editor
   *
   * @see http://id.loc.gov/vocabulary/relators/flm
   */
  | "flm"

  /**
   * Librettist
   *
   * @see http://id.loc.gov/vocabulary/relators/lbt
   */
  | "lbt"

  /**
   * Radio producer
   *
   * @see http://id.loc.gov/vocabulary/relators/rpc
   */
  | "rpc"

  /**
   * Expert
   *
   * @see http://id.loc.gov/vocabulary/relators/exp
   */
  | "exp"

  /**
   * Recording engineer
   *
   * @see http://id.loc.gov/vocabulary/relators/rce
   */
  | "rce"

  /**
   * Supporting host
   *
   * @see http://id.loc.gov/vocabulary/relators/sht
   */
  | "sht"

  /**
   * Rubricator
   *
   * @see http://id.loc.gov/vocabulary/relators/rbr
   */
  | "rbr"

  /**
   * Dedicatee
   *
   * @see http://id.loc.gov/vocabulary/relators/dte
   */
  | "dte"

  /**
   * Praeses
   *
   * @see http://id.loc.gov/vocabulary/relators/pra
   */
  | "pra"

  /**
   * Court governed
   *
   * @see http://id.loc.gov/vocabulary/relators/cou
   */
  | "cou"

  /**
   * Responsible party
   *
   * @see http://id.loc.gov/vocabulary/relators/rpy
   */
  | "rpy"

  /**
   * Director
   *
   * @see http://id.loc.gov/vocabulary/relators/drt
   */
  | "drt"

  /**
   * Contestant-appellee
   *
   * @see http://id.loc.gov/vocabulary/relators/coe
   */
  | "coe"

  /**
   * Instrumentalist
   *
   * @see http://id.loc.gov/vocabulary/relators/itr
   */
  | "itr"

  /**
   * Author
   *
   * @see http://id.loc.gov/vocabulary/relators/aut
   */
  | "aut"

  /**
   * Musical director
   *
   * @see http://id.loc.gov/vocabulary/relators/msd
   */
  | "msd"

  /**
   * Degree granting institution
   *
   * @see http://id.loc.gov/vocabulary/relators/dgg
   */
  | "dgg"

  /**
   * Sponsor
   *
   * @see http://id.loc.gov/vocabulary/relators/spn
   */
  | "spn"

  /**
   * Distribution place
   *
   * @see http://id.loc.gov/vocabulary/relators/dbp
   */
  | "dbp"

  /**
   * Mixing engineer
   *
   * @see http://id.loc.gov/vocabulary/relators/mxe
   */
  | "mxe"

  /**
   * Jurisdiction governed
   *
   * @see http://id.loc.gov/vocabulary/relators/jug
   */
  | "jug"

  /**
   * DJ
   *
   * @see http://id.loc.gov/vocabulary/relators/djo
   */
  | "djo"

  /**
   * Consultant to a project
   *
   * @see http://id.loc.gov/vocabulary/relators/csp
   */
  | "csp"

  /**
   * Respondent-appellant
   *
   * @see http://id.loc.gov/vocabulary/relators/rst
   */
  | "rst"

  /**
   * Radio director
   *
   * @see http://id.loc.gov/vocabulary/relators/rdd
   */
  | "rdd"

  /**
   * Binding designer
   *
   * @see http://id.loc.gov/vocabulary/relators/bdd
   */
  | "bdd"

  /**
   * Writer of added commentary
   *
   * @see http://id.loc.gov/vocabulary/relators/wac
   */
  | "wac"

  /**
   * Thesis advisor
   *
   * @see http://id.loc.gov/vocabulary/relators/ths
   */
  | "ths"

  /**
   * Editorial director
   *
   * @see http://id.loc.gov/vocabulary/relators/edd
   */
  | "edd"

  /**
   * Lender
   *
   * @see http://id.loc.gov/vocabulary/relators/len
   */
  | "len"

  /**
   * Music programmer
   *
   * @see http://id.loc.gov/vocabulary/relators/mup
   */
  | "mup"

  /**
   * Complainant
   *
   * @see http://id.loc.gov/vocabulary/relators/cpl
   */
  | "cpl"

  /**
   * Book designer
   *
   * @see http://id.loc.gov/vocabulary/relators/bkd
   */
  | "bkd"

  /**
   * Curator
   *
   * @see http://id.loc.gov/vocabulary/relators/cur
   */
  | "cur"

  /**
   * Special effects provider
   *
   * @see http://id.loc.gov/vocabulary/relators/sfx
   */
  | "sfx"

  /**
   * Place of address
   *
   * @see http://id.loc.gov/vocabulary/relators/pad
   */
  | "pad"

  /**
   * Proofreader
   *
   * @see http://id.loc.gov/vocabulary/relators/pfr
   */
  | "pfr"

  /**
   * Renderer
   *
   * @see http://id.loc.gov/vocabulary/relators/ren
   */
  | "ren"

  /**
   * Libelee-appellant
   *
   * @see http://id.loc.gov/vocabulary/relators/let
   */
  | "let"

  /**
   * Commentator for written text
   *
   * @see http://id.loc.gov/vocabulary/relators/cwt
   */
  | "cwt"

  /**
   * Colorist
   *
   * @see http://id.loc.gov/vocabulary/relators/clr
   */
  | "clr"

  /**
   * Author in quotations or text abstracts
   *
   * @see http://id.loc.gov/vocabulary/relators/aqt
   */
  | "aqt"

  /**
   * Degree supervisor
   *
   * @see http://id.loc.gov/vocabulary/relators/dgs
   */
  | "dgs"

  /**
   * Binder
   *
   * @see http://id.loc.gov/vocabulary/relators/bnd
   */
  | "bnd"

  /**
   * Second party
   *
   * @see http://id.loc.gov/vocabulary/relators/spy
   */
  | "spy"

  /**
   * Lyricist
   *
   * @see http://id.loc.gov/vocabulary/relators/lyr
   */
  | "lyr"

  /**
   * Author of afterword, colophon, etc.
   *
   * @see http://id.loc.gov/vocabulary/relators/aft
   */
  | "aft"

  /**
   * Markup editor
   *
   * @see http://id.loc.gov/vocabulary/relators/mrk
   */
  | "mrk"

  /**
   * Defendant
   *
   * @see http://id.loc.gov/vocabulary/relators/dfd
   */
  | "dfd"

  /**
   * Performer
   *
   * @see http://id.loc.gov/vocabulary/relators/prf
   */
  | "prf"

  /**
   * Autographer
   *
   * @see http://id.loc.gov/vocabulary/relators/ato
   */
  | "ato"

  /**
   * Host institution
   *
   * @see http://id.loc.gov/vocabulary/relators/his
   */
  | "his"

  /**
   * Set designer
   *
   * @see http://id.loc.gov/vocabulary/relators/std
   */
  | "std"

  /**
   * Dubious author
   *
   * @see http://id.loc.gov/vocabulary/relators/dub
   */
  | "dub"

  /**
   * Founder
   *
   * @see http://id.loc.gov/vocabulary/relators/fon
   */
  | "fon"

  /**
   * Patent holder
   *
   * @see http://id.loc.gov/vocabulary/relators/pth
   */
  | "pth"

  /**
   * Technical director
   *
   * @see http://id.loc.gov/vocabulary/relators/tcd
   */
  | "tcd"

  /**
   * Inventor
   *
   * @see http://id.loc.gov/vocabulary/relators/inv
   */
  | "inv"

  /**
   * Typographer
   *
   * @see http://id.loc.gov/vocabulary/relators/tyg
   */
  | "tyg"

  /**
   * Assignee
   *
   * @see http://id.loc.gov/vocabulary/relators/asg
   */
  | "asg"

  /**
   * Camera operator
   *
   * @see http://id.loc.gov/vocabulary/relators/cop
   */
  | "cop"

  /**
   * Writer of added text
   *
   * @see http://id.loc.gov/vocabulary/relators/wat
   */
  | "wat"

  /**
   * Screenwriter
   *
   * @see http://id.loc.gov/vocabulary/relators/aus
   */
  | "aus"

  /**
   * Commentator
   *
   * @see http://id.loc.gov/vocabulary/relators/cmm
   */
  | "cmm"

  /**
   * Artistic director
   *
   * @see http://id.loc.gov/vocabulary/relators/ard
   */
  | "ard"

  /**
   * Bookseller
   *
   * @see http://id.loc.gov/vocabulary/relators/bsl
   */
  | "bsl"

  /**
   * Editor
   *
   * @see http://id.loc.gov/vocabulary/relators/edt
   */
  | "edt"

  /**
   * Book producer
   *
   * @see http://id.loc.gov/vocabulary/relators/bkp
   */
  | "bkp"

  /**
   * Videographer
   *
   * @see http://id.loc.gov/vocabulary/relators/vdg
   */
  | "vdg"

  /**
   * Calligrapher
   *
   * @see http://id.loc.gov/vocabulary/relators/cll
   */
  | "cll"

  /**
   * Plaintiff-appellant
   *
   * @see http://id.loc.gov/vocabulary/relators/ptt
   */
  | "ptt"

  /**
   * Research team member
   *
   * @see http://id.loc.gov/vocabulary/relators/rtm
   */
  | "rtm"

  /**
   * Cartographer
   *
   * @see http://id.loc.gov/vocabulary/relators/ctg
   */
  | "ctg"

  /**
   * Woodcutter
   *
   * @see http://id.loc.gov/vocabulary/relators/wdc
   */
  | "wdc"

  /**
   * Engineer
   *
   * @see http://id.loc.gov/vocabulary/relators/eng
   */
  | "eng"

  /**
   * Makeup artist
   *
   * @see http://id.loc.gov/vocabulary/relators/mka
   */
  | "mka"

  /**
   * Researcher
   *
   * @see http://id.loc.gov/vocabulary/relators/res
   */
  | "res"

  /**
   * Contractor
   *
   * @see http://id.loc.gov/vocabulary/relators/ctr
   */
  | "ctr"

  /**
   * Casting director
   *
   * @see http://id.loc.gov/vocabulary/relators/cad
   */
  | "cad"

  /**
   * Cover designer
   *
   * @see http://id.loc.gov/vocabulary/relators/cov
   */
  | "cov"

  /**
   * Transcriber
   *
   * @see http://id.loc.gov/vocabulary/relators/trc
   */
  | "trc"

  /**
   * Forger
   *
   * @see http://id.loc.gov/vocabulary/relators/frg
   */
  | "frg"

  /**
   * Complainant-appellee
   *
   * @see http://id.loc.gov/vocabulary/relators/cpe
   */
  | "cpe"

  /**
   * Television guest
   *
   * @see http://id.loc.gov/vocabulary/relators/tlg
   */
  | "tlg"

  /**
   * Printer of plates
   *
   * @see http://id.loc.gov/vocabulary/relators/pop
   */
  | "pop"

  /**
   * Dubbing director
   *
   * @see http://id.loc.gov/vocabulary/relators/dbd
   */
  | "dbd"

  /**
   * Repository
   *
   * @see http://id.loc.gov/vocabulary/relators/rps
   */
  | "rps"

  /**
   * Film distributor
   *
   * @see http://id.loc.gov/vocabulary/relators/fds
   */
  | "fds"

  /**
   * Licensor
   *
   * @see http://id.loc.gov/vocabulary/relators/lso
   */
  | "lso"

  /**
   * Redaktor
   *
   * @see http://id.loc.gov/vocabulary/relators/red
   */
  | "red"

  /**
   * Degree committee member
   *
   * @see http://id.loc.gov/vocabulary/relators/dgc
   */
  | "dgc"

  /**
   * Puppeteer
   *
   * @see http://id.loc.gov/vocabulary/relators/ppt
   */
  | "ppt"

  /**
   * Stereotyper
   *
   * @see http://id.loc.gov/vocabulary/relators/str
   */
  | "str"

  /**
   * Defendant-appellant
   *
   * @see http://id.loc.gov/vocabulary/relators/dft
   */
  | "dft"

  /**
   * Correspondent
   *
   * @see http://id.loc.gov/vocabulary/relators/crp
   */
  | "crp"

  /**
   * Issuing body
   *
   * @see http://id.loc.gov/vocabulary/relators/isb
   */
  | "isb"

  /**
   * Rapporteur
   *
   * @see http://id.loc.gov/vocabulary/relators/rap
   */
  | "rap"

  /**
   * Conservator
   *
   * @see http://id.loc.gov/vocabulary/relators/con
   */
  | "con"

  /**
   * Writer of supplementary textual content
   *
   * @see http://id.loc.gov/vocabulary/relators/wst
   */
  | "wst"

  /**
   * Scribe
   *
   * @see http://id.loc.gov/vocabulary/relators/scr
   */
  | "scr"

  /**
   * Art copyist
   *
   * @see http://id.loc.gov/vocabulary/relators/acp
   */
  | "acp"

  /**
   * Software developer
   *
   * @see http://id.loc.gov/vocabulary/relators/swd
   */
  | "swd"

  /**
   * Scientific advisor
   *
   * @see http://id.loc.gov/vocabulary/relators/sad
   */
  | "sad"

  /**
   * Consultant
   *
   * @see http://id.loc.gov/vocabulary/relators/csl
   */
  | "csl"

  /**
   * Laboratory
   *
   * @see http://id.loc.gov/vocabulary/relators/lbr
   */
  | "lbr"

  /**
   * Depositor
   *
   * @see http://id.loc.gov/vocabulary/relators/dpt
   */
  | "dpt"

  /**
   * Sound designer
   *
   * @see http://id.loc.gov/vocabulary/relators/sds
   */
  | "sds"

  /**
   * Bookjacket designer
   *
   * @see http://id.loc.gov/vocabulary/relators/bjd
   */
  | "bjd"

  /**
   * Editor of compilation
   *
   * @see http://id.loc.gov/vocabulary/relators/edc
   */
  | "edc"

  /**
   * Facsimilist
   *
   * @see http://id.loc.gov/vocabulary/relators/fac
   */
  | "fac"

  /**
   * Depicted
   *
   * @see http://id.loc.gov/vocabulary/relators/dpc
   */
  | "dpc"

  /**
   * Sculptor
   *
   * @see http://id.loc.gov/vocabulary/relators/scl
   */
  | "scl"

  /**
   * Distributor
   *
   * @see http://id.loc.gov/vocabulary/relators/dst
   */
  | "dst"

  /**
   * Writer of intertitles
   *
   * @see http://id.loc.gov/vocabulary/relators/wft
   */
  | "wft"

  /**
   * Libelant-appellee
   *
   * @see http://id.loc.gov/vocabulary/relators/lie
   */
  | "lie"

  /**
   * Contestant-appellant
   *
   * @see http://id.loc.gov/vocabulary/relators/cot
   */
  | "cot"

  /**
   * Secretary
   *
   * @see http://id.loc.gov/vocabulary/relators/sec
   */
  | "sec"

  /**
   * Onscreen participant
   *
   * @see http://id.loc.gov/vocabulary/relators/onp
   */
  | "onp"

  /**
   * Film producer
   *
   * @see http://id.loc.gov/vocabulary/relators/fmp
   */
  | "fmp"

  /**
   * Caster
   *
   * @see http://id.loc.gov/vocabulary/relators/cas
   */
  | "cas"

  /**
   * Production place
   *
   * @see http://id.loc.gov/vocabulary/relators/prp
   */
  | "prp"

  /**
   * Blurb writer
   *
   * @see http://id.loc.gov/vocabulary/relators/blw
   */
  | "blw"

  /**
   * Writer of television story
   *
   * @see http://id.loc.gov/vocabulary/relators/wts
   */
  | "wts"

  /**
   * Provider
   *
   * @see http://id.loc.gov/vocabulary/relators/prv
   */
  | "prv"

  /**
   * Other
   *
   * @see http://id.loc.gov/vocabulary/relators/oth
   */
  | "oth"

  /**
   * Publication place
   *
   * @see http://id.loc.gov/vocabulary/relators/pup
   */
  | "pup"

  /**
   * Lighting designer
   *
   * @see http://id.loc.gov/vocabulary/relators/lgd
   */
  | "lgd"

  /**
   * Platemaker
   *
   * @see http://id.loc.gov/vocabulary/relators/plt
   */
  | "plt"

  /**
   * Marbler
   *
   * @see http://id.loc.gov/vocabulary/relators/mrb
   */
  | "mrb"

  /**
   * Contestee-appellee
   *
   * @see http://id.loc.gov/vocabulary/relators/cte
   */
  | "cte"

  /**
   * Field director
   *
   * @see http://id.loc.gov/vocabulary/relators/fld
   */
  | "fld"

  /**
   * Writer of film story
   *
   * @see http://id.loc.gov/vocabulary/relators/wfs
   */
  | "wfs"

  /**
   * Analyst
   *
   * @see http://id.loc.gov/vocabulary/relators/anl
   */
  | "anl"

  /**
   * Opponent
   *
   * @see http://id.loc.gov/vocabulary/relators/opn
   */
  | "opn"

  /**
   * Permitting agency
   *
   * @see http://id.loc.gov/vocabulary/relators/pma
   */
  | "pma"

  /**
   * Remix artist
   *
   * @see http://id.loc.gov/vocabulary/relators/rxa
   */
  | "rxa"

  /**
   * Photographer
   *
   * @see http://id.loc.gov/vocabulary/relators/pht
   */
  | "pht"

  /**
   * Presenter
   *
   * @see http://id.loc.gov/vocabulary/relators/pre
   */
  | "pre"

  /**
   * Patent applicant
   *
   * @see http://id.loc.gov/vocabulary/relators/pta
   */
  | "pta"

  /**
   * Donor
   *
   * @see http://id.loc.gov/vocabulary/relators/dnr
   */
  | "dnr"

  /**
   * Medium
   *
   * @see http://id.loc.gov/vocabulary/relators/med
   */
  | "med"

  /**
   * Event place
   *
   * @see http://id.loc.gov/vocabulary/relators/evp
   */
  | "evp"

  /**
   * Conductor
   *
   * @see http://id.loc.gov/vocabulary/relators/cnd
   */
  | "cnd"

  /**
   * Game developer
   *
   * @see http://id.loc.gov/vocabulary/relators/gdv
   */
  | "gdv"

  /**
   * Data manager
   *
   * @see http://id.loc.gov/vocabulary/relators/dtm
   */
  | "dtm"

  /**
   * Letterer
   *
   * @see http://id.loc.gov/vocabulary/relators/ltr
   */
  | "ltr"

  /**
   * Papermaker
   *
   * @see http://id.loc.gov/vocabulary/relators/ppm
   */
  | "ppm"

  /**
   * First party
   *
   * @see http://id.loc.gov/vocabulary/relators/fpy
   */
  | "fpy"

  /**
   * Respondent
   *
   * @see http://id.loc.gov/vocabulary/relators/rsp
   */
  | "rsp"

  /**
   * News anchor
   *
   * @see http://id.loc.gov/vocabulary/relators/nan
   */
  | "nan"

  /**
   * Court reporter
   *
   * @see http://id.loc.gov/vocabulary/relators/crt
   */
  | "crt"

  /**
   * Filmmaker
   *
   * @see http://id.loc.gov/vocabulary/relators/fmk
   */
  | "fmk"

  /**
   * Production personnel
   *
   * @see http://id.loc.gov/vocabulary/relators/prd
   */
  | "prd";
//endregion

//region Relator Labels
export const relatorLabels: Record<Relator, string> = {
  fmo: "Former owner",
  aue: "Audio engineer",
  spk: "Speaker",
  dsr: "Designer",
  bpd: "Bookplate designer",
  prn: "Production company",
  dis: "Dissertant",
  mus: "Musician",
  cor: "Collection registrar",
  bka: "Book artist",
  rse: "Respondent-appellee",
  ptf: "Plaintiff",
  egr: "Engraver",
  gis: "Geographic information specialist",
  prt: "Printer",
  ccp: "Conceptor",
  app: "Applicant",
  cpc: "Copyright claimant",
  lil: "Libelant",
  ape: "Appellee",
  hnr: "Honoree",
  cpt: "Complainant-appellant",
  orm: "Organizer",
  brl: "Braille embosser",
  adp: "Adapter",
  win: "Writer of introduction",
  ltg: "Lithographer",
  fnd: "Funder",
  crr: "Corrector",
  vac: "Voice actor",
  wde: "Wood engraver",
  anm: "Animator",
  mon: "Monitor",
  elt: "Electrotyper",
  asn: "Associated name",
  tlp: "Television producer",
  org: "Originator",
  sgd: "Stage director",
  com: "Compiler",
  ins: "Inscriber",
  cre: "Creator",
  mfr: "Manufacturer",
  mod: "Moderator",
  cmp: "Composer",
  dtc: "Data contributor",
  prc: "Process contact",
  sce: "Scenarist",
  tyd: "Type designer",
  pro: "Producer",
  cli: "Client",
  cos: "Contestant",
  dln: "Delineator",
  fmd: "Film director",
  trl: "Translator",
  pmn: "Production manager",
  pbl: "Publisher",
  ann: "Annotator",
  mtk: "Minute taker",
  tau: "Television writer",
  lel: "Libelee",
  aup: "Audio producer",
  arr: "Arranger",
  cst: "Costume designer",
  enj: "Enacting jurisdiction",
  mte: "Metal engraver",
  tld: "Television director",
  wal: "Writer of added lyrics",
  cph: "Copyright holder",
  chr: "Choreographer",
  stl: "Storyteller",
  mdc: "Metadata contact",
  rev: "Reviewer",
  lse: "Licensee",
  clt: "Collotyper",
  ivr: "Interviewer",
  ill: "Illustrator",
  arc: "Architect",
  lee: "Libelee-appellee",
  cts: "Contestee",
  adi: "Art director",
  elg: "Electrician",
  ant: "Bibliographic antecedent",
  osp: "Onscreen presenter",
  rcp: "Addressee",
  anc: "Announcer",
  pbd: "Publisher director",
  sde: "Sound engineer",
  att: "Attributed name",
  stm: "Stage manager",
  ilu: "Illuminator",
  drm: "Draftsman",
  prg: "Programmer",
  tlh: "Television host",
  ldr: "Laboratory director",
  sng: "Singer",
  wam: "Writer of accompanying material",
  sll: "Seller",
  rsr: "Restorationist",
  dto: "Dedicator",
  hst: "Host",
  prm: "Printmaker",
  rsg: "Restager",
  abr: "Abridger",
  rcd: "Recordist",
  cns: "Censor",
  ctb: "Contributor",
  rth: "Research team head",
  uvp: "University place",
  srv: "Surveyor",
  aud: "Author of dialog",
  tch: "Teacher",
  pat: "Patron",
  wpr: "Writer of preface",
  prs: "Production designer",
  art: "Artist",
  mcp: "Music copyist",
  pan: "Panelist",
  stg: "Setting",
  pte: "Plaintiff-appellee",
  apl: "Appellant",
  mfp: "Manufacture place",
  edm: "Editor of moving image work",
  wit: "Witness",
  act: "Actor",
  rpt: "Reporter",
  stn: "Standards body",
  ive: "Interviewee",
  vfx: "Visual effects provider",
  aui: "Author of introduction, etc.",
  lsa: "Landscape architect",
  auc: "Auctioneer",
  sgn: "Signer",
  ctt: "Contestee-appellant",
  pdr: "Project director",
  cng: "Cinematographer",
  jud: "Judge",
  led: "Lead",
  brd: "Broadcaster",
  col: "Collector",
  dfe: "Defendant-appellee",
  own: "Owner",
  nrt: "Narrator",
  cmt: "Compositor",
  lit: "Libelant-appellant",
  dnc: "Dancer",
  etr: "Etcher",
  flm: "Film editor",
  lbt: "Librettist",
  rpc: "Radio producer",
  exp: "Expert",
  rce: "Recording engineer",
  sht: "Supporting host",
  rbr: "Rubricator",
  dte: "Dedicatee",
  pra: "Praeses",
  cou: "Court governed",
  rpy: "Responsible party",
  drt: "Director",
  coe: "Contestant-appellee",
  itr: "Instrumentalist",
  aut: "Author",
  msd: "Musical director",
  dgg: "Degree granting institution",
  spn: "Sponsor",
  dbp: "Distribution place",
  mxe: "Mixing engineer",
  jug: "Jurisdiction governed",
  djo: "DJ",
  csp: "Consultant to a project",
  rst: "Respondent-appellant",
  rdd: "Radio director",
  bdd: "Binding designer",
  wac: "Writer of added commentary",
  ths: "Thesis advisor",
  edd: "Editorial director",
  len: "Lender",
  mup: "Music programmer",
  cpl: "Complainant",
  bkd: "Book designer",
  cur: "Curator",
  sfx: "Special effects provider",
  pad: "Place of address",
  pfr: "Proofreader",
  ren: "Renderer",
  let: "Libelee-appellant",
  cwt: "Commentator for written text",
  clr: "Colorist",
  aqt: "Author in quotations or text abstracts",
  dgs: "Degree supervisor",
  bnd: "Binder",
  spy: "Second party",
  lyr: "Lyricist",
  aft: "Author of afterword, colophon, etc.",
  mrk: "Markup editor",
  dfd: "Defendant",
  prf: "Performer",
  ato: "Autographer",
  his: "Host institution",
  std: "Set designer",
  dub: "Dubious author",
  fon: "Founder",
  pth: "Patent holder",
  tcd: "Technical director",
  inv: "Inventor",
  tyg: "Typographer",
  asg: "Assignee",
  cop: "Camera operator",
  wat: "Writer of added text",
  aus: "Screenwriter",
  cmm: "Commentator",
  ard: "Artistic director",
  bsl: "Bookseller",
  edt: "Editor",
  bkp: "Book producer",
  vdg: "Videographer",
  cll: "Calligrapher",
  ptt: "Plaintiff-appellant",
  rtm: "Research team member",
  ctg: "Cartographer",
  wdc: "Woodcutter",
  eng: "Engineer",
  mka: "Makeup artist",
  res: "Researcher",
  ctr: "Contractor",
  cad: "Casting director",
  cov: "Cover designer",
  trc: "Transcriber",
  frg: "Forger",
  cpe: "Complainant-appellee",
  tlg: "Television guest",
  pop: "Printer of plates",
  dbd: "Dubbing director",
  rps: "Repository",
  fds: "Film distributor",
  lso: "Licensor",
  red: "Redaktor",
  dgc: "Degree committee member",
  ppt: "Puppeteer",
  str: "Stereotyper",
  dft: "Defendant-appellant",
  crp: "Correspondent",
  isb: "Issuing body",
  rap: "Rapporteur",
  con: "Conservator",
  wst: "Writer of supplementary textual content",
  scr: "Scribe",
  acp: "Art copyist",
  swd: "Software developer",
  sad: "Scientific advisor",
  csl: "Consultant",
  lbr: "Laboratory",
  dpt: "Depositor",
  sds: "Sound designer",
  bjd: "Bookjacket designer",
  edc: "Editor of compilation",
  fac: "Facsimilist",
  dpc: "Depicted",
  scl: "Sculptor",
  dst: "Distributor",
  wft: "Writer of intertitles",
  lie: "Libelant-appellee",
  cot: "Contestant-appellant",
  sec: "Secretary",
  onp: "Onscreen participant",
  fmp: "Film producer",
  cas: "Caster",
  prp: "Production place",
  blw: "Blurb writer",
  wts: "Writer of television story",
  prv: "Provider",
  oth: "Other",
  pup: "Publication place",
  lgd: "Lighting designer",
  plt: "Platemaker",
  mrb: "Marbler",
  cte: "Contestee-appellee",
  fld: "Field director",
  wfs: "Writer of film story",
  anl: "Analyst",
  opn: "Opponent",
  pma: "Permitting agency",
  rxa: "Remix artist",
  pht: "Photographer",
  pre: "Presenter",
  pta: "Patent applicant",
  dnr: "Donor",
  med: "Medium",
  evp: "Event place",
  cnd: "Conductor",
  gdv: "Game developer",
  dtm: "Data manager",
  ltr: "Letterer",
  ppm: "Papermaker",
  fpy: "First party",
  rsp: "Respondent",
  nan: "News anchor",
  crt: "Court reporter",
  fmk: "Filmmaker",
  prd: "Production personnel",
};

export const relatorRoles = Object.keys(relatorLabels) as [
  Relator,
  ...Relator[],
];
//endregion
