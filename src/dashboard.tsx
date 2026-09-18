import { Fragment, useEffect, useState } from "react"
import { Button, Container, Dropdown, Nav, Navbar, Offcanvas, Table, Form, InputGroup, Row, Col, Pagination, Card, ToastContainer, Toast, Modal, ListGroup, OverlayTrigger, Popover} from "react-bootstrap"
import { Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import "./styles/bootstrap.min.css";


//Notes for the future when doing any other react project:
//Please for the love of god do not put everything in the same file, create module scripts with exported functions.
//

interface Filter {
    Column : string
    Filter: string
}

type RecordRow = Record<string, string | number | null>

interface TableQueryResult {
    success: boolean
    table?: string
    error?: string
    result?: RecordRow[]
    reports?: string[]
    count: number
}

interface ActivityRecords {
    id: number;
    "Nazwa": string;
    "Data Dodania": string;
    "Data Umówiona": string | null;
    "Ostatnia Sesja": string | null;
    "Użytkownik": string | null;
    "Notatka": string | null;
    "Odznaczone": 0 | 1;
}

interface ActivityRecordResult {
    success: boolean,
    error?: string,
    result?: ActivityRecords[]
}

interface PaginationValues {
    current: number
    last: number
}

const API_BASE = `${import.meta.env.BASE_URL}/crmapi`

export default function Dashboard() {
    const DEFAULTCOLUMNS = ["id", "Nazwa", "Nazwa Urządzenia", "Nazwa Klienta", "Ostatnia Sesja", "Data Umówiona", "Notatka"]

    const [displayedRowCount, setDisplayedRowCount] = useState<number>(50)
    const [loading, setLoading] = useState<boolean>(true)
    const [tableRange, setTableRange] = useState<[number, number]>([0, displayedRowCount])
    const [displayTable, setDisplayTable] = useState<RecordRow[] | undefined>(undefined)
    const [showOffCanvas, setShowOffCanvas] = useState<boolean>(false)
    const [allTables, setAllTables] = useState<string[] | undefined>(undefined)
    const [currentTable, setCurrentTable] = useState<string | undefined>(undefined)
    const [currentRecordInfo, setCurrentRecordInfo] = useState<RecordRow | undefined>(undefined)
    const [currentRecordActivity, setCurrentRecordActivity] = useState<ActivityRecords[] | undefined>(undefined)
    const [currentFilters, setCurrentFilters] = useState<Filter[]>([])
    const [currentSort, setCurrentSort] = useState<boolean>(true) //false = desc, true = asc
    const [currentPos, setCurrentPos] = useState<PaginationValues>()
    const [rowCount, setRowCount] = useState<number>(0)
    const [allowNull, setAllowNull] = useState<boolean>(true)
    const [currentColumns, setCurrentColumns] = useState<string[]>([])
    const [displayedColumns, setDisplayedColumns] = useState<string[]>([])
    const [mostRecentTable, setMostRecentTable] = useState<string | undefined>(undefined)
    const [activityAddStatus, setActivityAddStatus] = useState<string>("idle")
    const [OrderedColumns, setOrderedColumns] = useState<string[]>([])
    const [currentAlerts, setCurrentAlerts] = useState<ActivityRecords[]>([])
    const [hiddenAlerts, setHiddenAlerts] = useState<number[]>([])
    const [showContactModal, setShowContactModal] = useState<boolean>(false)
    const [showConservationModal,setShowConservationModal] = useState<boolean>(false)
    const [currentActivityId, setCurrentActivityId] = useState<number>(0)
    const [, setTimeTick] = useState(0) // bumped periodically to refresh relative-time labels

    const dangerThreshold = new Date().setMonth(new Date().getMonth() - 3) // 3 months
    const warningThreshold = new Date().setMonth(new Date().getMonth() - 1) // 1 months

    const activityDangerThreshold = new Date().setHours(new Date().getHours() + 1) //in 1 hour
    const activityWarningThreshold = new Date().setHours(new Date().getHours() + 24) //in a day

    async function loadInitTable() {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/view_latest_report.php`, {
                method: "GET"
            })
            const data : TableQueryResult = await response.json()
            if (!response.ok || !data.success) {
            throw new Error(data?.error)
            }
            let returned_columns = Object.keys(data.result![0])
            setCurrentColumns(returned_columns)
            setDisplayedColumns(DEFAULTCOLUMNS)
            setDisplayTable(data.result)
            setCurrentTable(data.table)
            setMostRecentTable(data.table)
            setRowCount(data.count)
            handleScrollBar(undefined,data.count)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function handleDetailClick(id: number, name: string) {
        if (!showOffCanvas){
            try {
                const response = await fetch(`${API_BASE}/get_record.php`, {
                    method: "POST",
                    body: JSON.stringify({
                        id: id,
                        table: currentTable
                    })
                })
            const data: TableQueryResult = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
                setCurrentRecordInfo(data.result![0])
                setActivityAddStatus("idle")
            } catch (error) {
                console.error(error)
            }
            try {
                const response = await fetch(`${API_BASE}/get_all_activity.php`, {
                    method: "POST",
                    body: JSON.stringify({
                        name: name
                    })
                })
                const data: ActivityRecordResult = await response.json()
                if (!response.ok || !data.success) {
                    throw new Error(data?.error)
                }
                setCurrentRecordActivity(data.result)
            }catch (error){
                console.error(error)
            }finally{
                setShowOffCanvas(true)
            }
        }
    }

    async function loadTable(column : string, filter: string) {
        let thisFilter: Filter = {
            Column: column,
            Filter: filter,
        }
        let localcurrentFilters: Filter[] = [...currentFilters, thisFilter]
        currentFilters.forEach(filter => {
            if(filter.Column == thisFilter.Column){
                if(filter.Filter == thisFilter.Filter){
                    console.log("already filtering for this")
                }else{
                    localcurrentFilters = [...currentFilters.filter(filter => filter.Column != thisFilter.Column), thisFilter]
                }
            }
        });
        let filteredcolumns: Record<string,string> = {}
        localcurrentFilters.forEach(filters => {
            filteredcolumns[filters.Column as keyof typeof filteredcolumns] = filters.Filter
        });
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/get_filtered_report.php`, {
                method: "POST",
                body: JSON.stringify({
                    table: currentTable,
                    columns: filteredcolumns,
                    sort: currentSort,
                    range: tableRange,
                    allow_null: allowNull,
                    orderby: OrderedColumns
                })
            })
            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            setCurrentColumns(Object.keys(data.result[0]))
            setDisplayTable(data.result)
            setRowCount(data.count)
            handleScrollBar(undefined,data.count)
            setTableRange([0,displayedRowCount])
        } catch (error) {
            console.error(error)
        } finally {
            setCurrentFilters(localcurrentFilters)
            setLoading(false)
        }
    }

    async function reloadTable(sort?:boolean, range?:[number,number],allownull?: boolean, table?: string, fullclean?:boolean) {
        let localsort = sort == undefined? currentSort : sort
        let localrange = range == undefined? tableRange : range
        let localallownul = allownull == undefined? allowNull : allownull
        let localtable = table == undefined? currentTable : table
        let filteredcolumns: Record<string,string> = {}
        let localorderedcolumns = OrderedColumns
        if(fullclean){
            setCurrentSort(true)
            setCurrentFilters([])
            setTableRange([0,displayedRowCount])
            setOrderedColumns([])
            localorderedcolumns = []
            localsort = true
            localrange = [0,displayedRowCount]
        }else{
            currentFilters.forEach(filters => {
                filteredcolumns[filters.Column as keyof typeof filteredcolumns] = filters.Filter
            });
        }
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/get_filtered_report.php`, {
                method: "POST",
                body: JSON.stringify({
                    table: localtable,
                    columns: filteredcolumns,
                    sort: localsort,
                    range: localrange,
                    allow_null: localallownul,
                    orderby: localorderedcolumns
                })
            })
            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            setCurrentColumns(Object.keys(data.result![0]))
            if (table) {
                let returned_columns = Object.keys(data.result![0])
                setCurrentColumns(returned_columns)
                setDisplayedColumns(DEFAULTCOLUMNS)
            }
            setDisplayTable(data.result)
            setTableRange(localrange)
            setRowCount(data.count)
            setCurrentTable(localtable)
            if(!range || sort){
                handleScrollBar(undefined, data.count, !(fullclean || table))
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function getTables() {
        setLoading(true)
        try {
                const response = await fetch(`${API_BASE}/get_all_reports.php`, {
                    method: "GET"
                })
                const data: TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                setAllTables(data.reports)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
    }
    async function reloadActivities(){
        try {
                const response = await fetch(`${API_BASE}/get_all_activity.php`, {
                    method: "POST",
                    body: JSON.stringify({
                        name: currentRecordInfo!["Nazwa"]
                    })
                })
                const data: ActivityRecordResult = await response.json()
                if (!response.ok || !data.success) {
                    throw new Error(data?.error)
                }
                setCurrentRecordActivity(data.result)
            }catch (error){
                console.error(error)
            }
    }

    async function handleConservation(formData: FormData){
        const nameInput = formData.get("nameInput") as string
        const noteInput = formData.get("realizenoteInput") as string;
        setActivityAddStatus("loading")
        try {
                const response = await fetch(`${API_BASE}/set_activity.php`, {
                    method: "POST",
                    body: JSON.stringify({
                        name: currentRecordInfo!["Nazwa"],
                        username: nameInput,
                        conservation: true,
                        note: noteInput,
                        mark: 1
                    })
                })
                const data: TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                setActivityAddStatus("success")
                reloadTable()
            } catch (error) {
                setActivityAddStatus("error")
                console.error(error)
            }
    }

    async function handleActivityRealization(e: React.FormEvent<HTMLFormElement>, conservation?: boolean) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget) 
        const nameInput = formData.get("nameInput")
        const noteInput = formData.get("realizenoteInput")
        const potentialDateInput = formData.get("dateInput")
        let status = ""
        setActivityAddStatus("loading")
        try {
                const response = await fetch(`${API_BASE}/mark_as_realized.php`, {
                    method: "POST",
                    body: JSON.stringify({
                        id: currentActivityId,
                        username: nameInput,
                        note: noteInput,
                    })
                })
                const data: TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                status = "success"
            } catch (error) {
                status = "error"
                console.error(error)
        }
        if (!(potentialDateInput === null || potentialDateInput === "")){
            await handleAddActivity(formData)
        }else{
            if(conservation){
                await handleConservation(formData)
            }
        }
        reloadActivities()
        setActivityAddStatus(status)
        setShowConservationModal(false)
        setShowContactModal(false)
        reloadTable()
    }

    async function handleAddActivity(formData: FormData) {
        const dateInput = formData.get("dateInput") as string;
        const nameInput = formData.get("nameInput") as string
        const timeInput = formData.get("timeInput") as string;
        const noteInput = formData.get("noteInput") as string;
        setActivityAddStatus("loading")
        try {
                const response = await fetch(`${API_BASE}/set_activity.php`, {
                    method: "POST",
                    body: JSON.stringify({
                        name: currentRecordInfo!["Nazwa"],
                        username: nameInput,
                        meeting_date: dateInput + " " + timeInput,
                        note: noteInput
                    })
                })
                const data: TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                reloadActivities()
                setActivityAddStatus("success")
                reloadTable()
            } catch (error) {
                setActivityAddStatus("error")
                console.error(error)
            }
        
    }

    async function getAlerts() {
        let currentalertids: number[] = []
        currentAlerts.forEach((element) => {
            currentalertids.push(element["id"])
        })
        try {
            const response = await fetch(`${API_BASE}/check_for_alerts.php`, {
                method: "POST",
                body: JSON.stringify({
                    ids : currentalertids
                })
            })
            const data: ActivityRecordResult = await response.json()
            if (!response.ok || !data.success) {
            throw new Error(data?.error)
            }
            const newRows = (data.result ?? []).filter(
                row => !currentAlerts.some(element => element["id"] === row["id"])
            )
            if (newRows.length > 0) {
                setCurrentAlerts([...currentAlerts, ...newRows])
            }
        } catch (error) {
            console.error(error)
        }
    }

    async function handleTableDelete(table: string) {
        console.log(table)
        if(confirm("Czy jesteś napewno chcesz usunąć tą tabele?")){
            try {
                const response = await fetch(`${API_BASE}/delete_raport.php`, {
                    method: "POST",
                    body: JSON.stringify({
                        table: table
                    })
                })
                const data: TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                setLoading(true)
                await getTables()
                await loadInitTable()
            } catch (error) {
                console.log(error)
            }
        }
    }

    function polishPluralForm(count: number, forms: [string, string, string]): string {
    if (count === 1) return forms[0]
    const lastDigit = count % 10
    const lastTwoDigits = count % 100
    if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
        return forms[1]
    }
    return forms[2]
    }

    function getRelativeTimeString(dateString: string): string {
        const target = new Date(dateString.replace(" ", "T"))
        const diffSeconds = Math.round((target.getTime() - Date.now()) / 1000)
        const absSeconds = Math.abs(diffSeconds)

        const units: [[string, string, string], number][] = [
            [["rok", "lata", "lat"], 60 * 60 * 24 * 365],
            [["miesiąc", "miesiące", "miesięcy"], 60 * 60 * 24 * 30],
            [["tydzień", "tygodnie", "tygodni"], 60 * 60 * 24 * 7],
            [["dzień", "dni", "dni"], 60 * 60 * 24],
            [["godzina", "godziny", "godzin"], 60 * 60],
            [["minuta", "minuty", "minut"], 60],
        ]

        for (const [forms, unitSeconds] of units) {
            if (absSeconds >= unitSeconds) {
                const value = Math.round(absSeconds / unitSeconds)
                const label = `${value} ${polishPluralForm(value, forms)}`
                return diffSeconds > 0 ? `za ${label}` : `${label} temu`
            }
        }

        return diffSeconds > 0 ? "za mniej niż minutę" : "przed chwilą"
    }


    function calculateTableRange(pos: PaginationValues, rowcount?: number): [number,number] {
        let localdisplayedrowcount = rowcount == undefined? displayedRowCount : rowcount
        return [localdisplayedrowcount * pos.current,  localdisplayedrowcount * pos.current + localdisplayedrowcount]
    }


    function handleRowCountChange(newCount: number) {
        const pageAmount = Math.ceil(rowCount / newCount) - 1
        const newPos: PaginationValues = { current: 0, last: pageAmount }
        const newRange: [number, number] = [0, newCount]

        setDisplayedRowCount(newCount)
        setCurrentPos(newPos)
        setTableRange(newRange)
        reloadTable(undefined, newRange)
    }

    function handleScrollBar(movement?: string, rowCount?: number, preserveCurrent?: boolean){
        if(movement && currentPos != undefined){
            switch(movement){
                case("prev"):
                    let prevvalue = (currentPos!.current - 1 <= 0)? 0 : currentPos!.current - 1
                    let prevPos = {
                        current: prevvalue,
                        last: currentPos!.last
                    }
                    setCurrentPos(prevPos)
                    reloadTable(undefined,calculateTableRange(prevPos))
                    break
                    
                case("next"):
                    let nextvalue = (currentPos!.current + 1 >= currentPos.last)?  currentPos!.last : currentPos!.current + 1
                    let nextPos: PaginationValues = {
                        current: nextvalue,
                        last: currentPos!.last
                    }
                    setCurrentPos(nextPos)
                    reloadTable(undefined,calculateTableRange(nextPos))
                    break

                case("last"):
                    let lastPos: PaginationValues = {
                        current: currentPos!.last,
                        last: currentPos!.last
                    }
                    setCurrentPos(lastPos)
                    reloadTable(undefined,calculateTableRange(lastPos))
                    break

                case("first"):
                    let firstPos: PaginationValues = {
                        current: 0,
                        last: currentPos!.last
                    }
                    setCurrentPos(firstPos)
                    reloadTable(undefined,calculateTableRange(firstPos))
                    break
            }
        }else{
            if(rowCount){
                let pageAmount = Math.ceil(rowCount / displayedRowCount) - 1
                setRowCount(rowCount)
                setCurrentPos(prev => ({
                    current: (preserveCurrent && prev) ? Math.min(prev.current, pageAmount) : 0,
                    last: pageAmount,
                }))
            }
        }
    }

    function handleDetailHide(){
        setShowOffCanvas(false)
    }

    function evaluateDate(date?: string, elementName?: string) {
        if (date) {
            if (elementName != "Data Umówiona" && elementName != "Notatka"){
                let typedate = Date.parse(date)
                if (typedate <= dangerThreshold) {
                    return "table-danger"
                } else if (typedate <= warningThreshold) {
                    return "table-warning"
                }
                return "table-light"
            }else{
                let typedate = Date.parse(date)
                if (typedate <= activityDangerThreshold) {
                    return "table-danger"
                } else if (typedate <= activityWarningThreshold) {
                    return "table-warning"
                }
                return "table-light"
            }
        }
    }

    function isDateLike(value: string | number | null): value is string {
        if (typeof value !== "string") return false
        return /^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>, column: string) => {
        e.preventDefault()
        const input = new FormData(e.currentTarget).get("filterInput") as string;
        void loadTable(column, input)
    }

    const checkForFilterValues = (element: string): string => {
    return currentFilters.find((filter) => filter.Column === element)?.Filter ?? ""
    }

    useEffect(() => {
        const timeTickInterval = setInterval(() => setTimeTick(tick => tick + 1), 5000)
        return () => clearInterval(timeTickInterval)
    }, [])

    // fetch once on mount
    useEffect(() => {
        if (!displayTable) {
            void loadInitTable()
        }
        if (!allTables) {
            void getTables()
        }
        if(currentAlerts.length == 0){
            getAlerts()
        }
        setInterval(() => {
            getAlerts()
        }, 60000);
    }, [])

    const popover = (
        <Popover>
            <Popover.Header>
                Informacje:
            </Popover.Header>
           <Popover.Body>
                <ListGroup>
                    {Object.keys(currentRecordInfo ?? {}).map((key, index) => (
                        <ListGroup.Item key={index}>{key}: {currentRecordInfo?.[key]}</ListGroup.Item>
                    ))}
                </ListGroup>
            </Popover.Body> 
        </Popover>
    );

    return (
        <>
            <Navbar expand="lg" className="navbar navbar-expand-lg bg-primary" data-bs-theme="dark" style={{borderRadius: "10px", margin: "20px"}}>
                <Container fluid>
                    <Navbar.Brand as={Link} to={`${import.meta.env.BASE_URL}/`}>Cemit CRM</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to={`${import.meta.env.BASE_URL}/import`}>Importuj CSV</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container  style={{margin: "1%", maxWidth: "98%"}}>
                {loading && <p>Ładowanie...</p>}

                {!loading && displayTable && (
                    <>
                        {(currentAlerts.length != 0 && !(hiddenAlerts.length >= currentAlerts.length)) && (
                            <Container style={{borderRadius: "5px", padding:"1%", backgroundColor:"#FFEB9E", marginBottom: "1%"}} fluid>
                            <h3 style={{color:"black", marginBottom: "1%"}}>Najbliższe spotkania:</h3>
                                <ToastContainer className="position-static d-flex flex-row flex-wrap gap-2 mb-2">
                                    {currentAlerts.map((alert) => (
                                        <Toast key={alert.id} show={!(hiddenAlerts.includes(alert.id))} onClick={() => handleDetailClick(alert.id,alert.Nazwa)} onClose={(e) => {
                                            e?.stopPropagation(); setHiddenAlerts([...hiddenAlerts, alert.id])
                                            }}>
                                            <Toast.Header>
                                                <strong className="me-auto">{alert.Nazwa}</strong>
                                                <small>{getRelativeTimeString(alert["Data Umówiona"]!)}</small>
                                            </Toast.Header>
                                            <Toast.Body>
                                                Notatka: {alert.Notatka || "Brak notatki"}
                                            </Toast.Body>
                                        </Toast>
                                    ))}
                                </ToastContainer>
                            </Container>
                        )}
                        <Container style={{borderRadius:"5px", padding:"1%", marginBottom:"1%"}} className="bg-secondary" fluid>
                            <Row>
                                <Col md="auto">
                                    <Dropdown>
                                        <Dropdown.Toggle variant="primary" id="dropdown-reports">
                                            {currentTable!.replace("data_","")}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu style={{maxHeight:"300px", overflowY:"scroll"}}>
                                            <Dropdown.Item onClick={() => void reloadTable(undefined, undefined, undefined, mostRecentTable)}>
                                                {mostRecentTable!.replace("data_","")}
                                            </Dropdown.Item>
                                            <Dropdown.Divider/>
                                            {allTables?.map((table, index) => (
                                                <Dropdown.Item 
                                                    key={index} 
                                                    onClick={() => void reloadTable(undefined, undefined, undefined, table)}
                                                    className="d-flex justify-content-between align-items-center"
                                                >
                                                    <span>{table.replace("data_","")}</span>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        className="py-0 px-1 ms-2"
                                                        onClick={(e) => { e.stopPropagation(); handleTableDelete(table) }}
                                                    >
                                                        <X size={14}/>
                                                    </Button>
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Col>
                                <Col md="auto">
                                    <Button variant="danger" onClick={() => reloadTable(undefined,undefined,undefined,undefined,true)}>Wyczyść Filtry</Button>
                                </Col>
                                <Col md="auto">
                                    <InputGroup>
                                        <InputGroup.Text className="bg-light">Sortuj:</InputGroup.Text>
                                        <Button variant="outline-primary" onClick={() => {
                                            void reloadTable(true)
                                            setCurrentSort(true)
                                            }} active={currentSort === true}>Rosnąco</Button>
                                        <Button variant="outline-primary" onClick={() => {
                                            void reloadTable(false)
                                            setCurrentSort(false)
                                            }} active={currentSort === false}>Malejąco</Button>
                                    </InputGroup>
                                </Col>
                                <Col md="auto">
                                    <Pagination>
                                        <Pagination.First onClick={() => handleScrollBar("first")}/>
                                        <Pagination.Prev onClick={() => handleScrollBar("prev")}/>

                                        <Pagination.Item>{currentPos!.current + 1}/{currentPos!.last + 1}</Pagination.Item>

                                        <Pagination.Next onClick={() => handleScrollBar("next")}/>
                                        <Pagination.Last onClick={() => handleScrollBar("last")}/>
                                    </Pagination>
                                </Col>
                                <Col md="auto">
                                    <Dropdown>
                                        <Dropdown.Toggle>{displayedRowCount}/{rowCount}</Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            <Dropdown.Item onClick={() => handleRowCountChange(50)}>50</Dropdown.Item>
                                            <Dropdown.Item onClick={() => handleRowCountChange(100)}>100</Dropdown.Item>
                                            <Dropdown.Item onClick={() => handleRowCountChange(200)}>200</Dropdown.Item>
                                            <Dropdown.Item onClick={() => handleRowCountChange(rowCount)}>ALL</Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Col>
                                <Col md="auto">
                                    <InputGroup>
                                            <InputGroup.Checkbox checked={allowNull} onChange={() => {
                                                void reloadTable(undefined,undefined,!allowNull)
                                                setAllowNull(!allowNull)
                                            }}/>
                                            <InputGroup.Text>Pokazuj NULL przy filtrowaniu</InputGroup.Text>
                                    </InputGroup>
                                </Col>
                                <Col>
                                    <Dropdown>
                                        <Dropdown.Toggle>
                                            Wyświetlane kolumny:
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu style={{padding:"10px", maxWidth:"500px"}}>
                                            {currentColumns.map((element, index) => (
                                                <Form key={index}>
                                                    <InputGroup>
                                                        <Form.Check 
                                                        type="switch" 
                                                        checked={displayedColumns.includes(element)} 
                                                        label={element}
                                                        onChange={() => {
                                                            if (displayedColumns.includes(element)){
                                                                setDisplayedColumns(displayedColumns.filter(column => column !== element))
                                                            }else{
                                                                setDisplayedColumns(currentColumns.filter(col => col === element || displayedColumns.includes(col)))
                                                            }
                                                        }}/> 
                                                    </InputGroup>
                                                </Form>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Col>
                            </Row>
                        </Container>
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    {displayedColumns.map((element, index) => (
                                        <Fragment key={index}>
                                            <th>
                                                <Dropdown autoClose="outside">
                                                    {(checkForFilterValues(element) == "") ? 
                                                    <Dropdown.Toggle variant="success" id="search-dropdown">
                                                        {element}
                                                    </Dropdown.Toggle> :  
                                                    <Dropdown.Toggle variant="danger" id="search-dropdown">
                                                        {element}
                                                    </Dropdown.Toggle>}

                                                    <Dropdown.Menu className="p-2" style={{ minWidth: "280px" }}>
                                                        <Form onSubmit={(e) => handleSubmit(e,element)} id={element}>
                                                            <Row>
                                                                <InputGroup>
                                                                    <Form.Control
                                                                    type="text"
                                                                    placeholder="Wyszukaj..."
                                                                    autoFocus
                                                                    name="filterInput"
                                                                    defaultValue={checkForFilterValues(element)}
                                                                    />
                                                                    <Button type="submit" variant="primary">
                                                                    <Search size={16} />
                                                                    </Button>
                                                                </InputGroup>
                                                            </Row>
                                                            <Row>
                                                                <InputGroup>
                                                                    <InputGroup.Checkbox checked={OrderedColumns.includes(element)} onChange={() => {
                                                                        if (OrderedColumns.includes(element)){
                                                                            setOrderedColumns(OrderedColumns.filter(column => column !== element))
                                                                        }else{
                                                                            setOrderedColumns([...OrderedColumns, element])
                                                                        }
                                                                    }}/>
                                                                    <InputGroup.Text>Sortuj Kolumną</InputGroup.Text>
                                                                </InputGroup>
                                                            </Row>
                                                        </Form>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </th>
                                        </Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayTable.map((row, index) => (
                                    <tr key={index} onClick={() => {
                                        void handleDetailClick(Number(row["id"]),String(row["Nazwa"]))
                                    }} className="table-light">
                                        {displayedColumns.map((element, index) => {
                                            if (isDateLike(row[element])){
                                                return <td key={index} className={evaluateDate(row[element]?.toString(),element)}>{row[element]}</td>
                                            }else{
                                                return <td key={index}>{row[element]}</td>
                                            }
                                        }
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                )}
                <Offcanvas show={showOffCanvas} onHide={handleDetailHide}>
                                <Offcanvas.Header closeButton>
                                    <OverlayTrigger trigger="hover" placement="bottom" overlay={popover}>
                                        <Offcanvas.Title>{currentRecordInfo?.Nazwa}</Offcanvas.Title>
                                    </OverlayTrigger>
                                </Offcanvas.Header>
                                <Offcanvas.Body>
                                    <Button onClick={() => {setShowConservationModal(true); setCurrentActivityId(0)}}>Dodaj Niezależną Konserwacje</Button> 
                                    {/* Shouldn't have a id of 0 ever, hopefully */}
                                    <Form style={{marginTop:"3%", padding:"5%", borderRadius:"5px"}} className="bg-secondary" onSubmit={(e) => { e.preventDefault(); handleAddActivity(new FormData(e.currentTarget)) }}>
                                        <Row style={{marginBottom: "10%", fontWeight: "bold"}}>
                                            <Col>
                                                <Form.Label>Dodaj Przyszły Kontakt</Form.Label>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Form.Label>Imie Pracownika:</Form.Label>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Form.Control type="text" name="nameInput" required/>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Form.Label>Data umówionej sesji:</Form.Label>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Form.Control type="date" name="dateInput" required/>
                                            </Col>
                                            <Col>
                                                <Form.Control type="time" name="timeInput" required/>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Form.Label>Notatka:</Form.Label>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Form.Control as="textarea" name="noteInput"/>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Button type="submit" style={{marginTop:"5%"}} disabled={activityAddStatus == "loading"}>Dodaj</Button>
                                            </Col>
                                        </Row>
                                    </Form>
                                    {(activityAddStatus == "error") && <h5 style={{color:"red"}}>Coś poszło nie tak, sprawdź konsole.</h5>}
                                    {(activityAddStatus == "success") && <h5 style={{color:"green"}}>Aktywność dodana pomyślnie!</h5>}
                                    {activityAddStatus !== "loading" && (<Container style={{marginTop:"20px"}}>
                                        <h3>Historia Aktywności:</h3>
                                        {currentRecordActivity?.map((activity : ActivityRecords) => (
                                            <Card style={(activity["Odznaczone"] === 1)? {marginTop:"2%"} : {marginTop:"2%"}}>
                                                <Card.Header>Data Dodania: {activity["Data Dodania"]}</Card.Header>
                                                <Card.Body style={(activity["Odznaczone"] === 1)? {backgroundColor:"#C6F5B5"} : {backgroundColor:"#FFEB9E"}}>
                                                    <Card.Title>{activity["Ostatnia Sesja"]? <>Konserwacja</> : <>Kontakt</>}</Card.Title>
                                                    {(activity["Odznaczone"] === 1)? 
                                                    <Card.Text>
                                                        Wykonano: {activity["Ostatnia Sesja"]? getRelativeTimeString(activity["Ostatnia Sesja"]!) : getRelativeTimeString(activity["Data Umówiona"]!)}<br/>
                                                        Przez: {activity["Użytkownik"]}<br/>
                                                        Notatka: {activity["Notatka"]}
                                                    </Card.Text> : 
                                                    <Card.Text>
                                                        Zaplanowany na: {getRelativeTimeString(activity["Data Umówiona"]!)}<br/>
                                                        Przez: {activity["Użytkownik"]}<br/>
                                                        Notatka: {activity["Notatka"]}<br/>
                                                    </Card.Text>}
                                                    <Container>
                                                        <Row>
                                                            <Col>
                                                                <Button disabled={activity["Odznaczone"] === 1} onClick={() => {setShowContactModal(true); setCurrentActivityId(activity["id"])}}>Zrealizuj Kontakt</Button>
                                                            </Col>
                                                            <Col>
                                                                <Button disabled={activity["Odznaczone"] === 1} onClick={() => {setShowConservationModal(true); setCurrentActivityId(activity["id"])}}>Dodaj Konserwacje</Button>
                                                            </Col>
                                                        </Row>
                                                    </Container>
                                                </Card.Body>
                                            </Card>
                                        ))}
                                    </Container>)}
                            </Offcanvas.Body>
                    </Offcanvas>
                    <Modal show={showContactModal} onHide={()=> setShowContactModal(false)}>
                        <Modal.Header closeButton>
                            <Modal.Title>Zrealizuj Kontakt</Modal.Title>
                        </Modal.Header>
                        <Form onSubmit={handleActivityRealization}>
                            <Modal.Body>
                                <Container>
                                    <Row>
                                        <Form.Group>
                                            <Form.Label>Imie Pracownika:</Form.Label>
                                            <Form.Control type="text" name="nameInput" required/>
                                        </Form.Group>
                                    </Row>
                                    <Row>
                                        <Form.Group>
                                            <Form.Label>Notatka:</Form.Label>
                                            <Form.Control as="textarea" name="realizenoteInput"/>
                                        </Form.Group>
                                    </Row>
                                        <hr style={{margin:"4%", borderWidth:"3px"}}/>
                                    <Row style={{marginBottom:"2%", fontWeight:"bold"}}>
                                        <Form.Label>Dodaj Kolejny Kontakt:</Form.Label>
                                    </Row>
                                    <Row>
                                        <Form.Label>Data Umówionej Sesji:</Form.Label>
                                    </Row>
                                    <Row>
                                            <Col>
                                                <Form.Control type="date" name="dateInput"/>
                                            </Col>
                                            <Col>
                                                <Form.Control type="time" name="timeInput"/>
                                            </Col>
                                    </Row>
                                    <Row>
                                        <Form.Group>
                                            <Form.Label>Notatka:</Form.Label>
                                            <Form.Control as="textarea" name="noteInput"/>
                                        </Form.Group>
                                    </Row>
                                </Container>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button type="submit">Zrealizuj</Button>
                            </Modal.Footer>
                        </Form>
                    </Modal>
                    <Modal show={showConservationModal} onHide={()=> setShowConservationModal(false)}>
                        <Modal.Header closeButton>
                            <Modal.Title>Zrealizuj Konserwacje</Modal.Title>
                        </Modal.Header>
                        <Form onSubmit={(e) => handleActivityRealization(e,true)}>
                            <Modal.Body>
                                <Container>
                                    <Row>
                                        <Form.Group>
                                            <Form.Label>Imie Pracownika:</Form.Label>
                                            <Form.Control type="text" name="nameInput" required/>
                                        </Form.Group>
                                    </Row>
                                    <Row>
                                        <Form.Group>
                                            <Form.Label>Notatka:</Form.Label>
                                            <Form.Control as="textarea" name="realizenoteInput"/>
                                        </Form.Group>
                                    </Row>
                                </Container>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button type="submit">Zrealizuj</Button>
                            </Modal.Footer>
                        </Form>
                    </Modal>
            </Container>
        </>
    )
}
